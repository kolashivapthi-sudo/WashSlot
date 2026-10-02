import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays } from 'date-fns';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async book(userId: string, slotId: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { machine: true },
    });

    if (!slot) throw new NotFoundException('Slot not found.');
    if (slot.status !== 'AVAILABLE') throw new BadRequestException('Slot is not available.');
    if (slot.machine.status === 'UNDER_REPAIR') {
      throw new BadRequestException('This machine is under repair. Cannot book.');
    }

    // Rule: user can only book next slot after current slot fully ends
    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        slot: { endTime: { gt: new Date() } },
      },
      include: { slot: true },
    });
    if (activeBooking) {
      throw new BadRequestException(
        'You already have an active booking. You can book your next slot only after your current slot ends.',
      );
    }

    // Rule: check rolling 7-day frequency limit
    const appConfig = await this.prisma.appConfig.findFirst();
    const weeklyLimit = appConfig?.weeklyBookingLimit ?? 3;
    const sevenDaysAgo = subDays(new Date(), 7);

    const recentBookingCount = await this.prisma.booking.count({
      where: {
        userId,
        countsAgainstLimit: true,
        bookedAt: { gte: sevenDaysAgo },
      },
    });

    if (recentBookingCount >= weeklyLimit) {
      throw new BadRequestException(
        `You have reached your weekly booking limit of ${weeklyLimit}. Try again after your oldest booking falls outside the 7-day window.`,
      );
    }

    // Create booking + update slot status in a transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: { userId, slotId, status: 'CONFIRMED' },
      });
      await tx.slot.update({ where: { id: slotId }, data: { status: 'BOOKED' } });
      return newBooking;
    });

    return booking;
  }

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.userId !== userId) throw new ForbiddenException('Not your booking.');
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed bookings can be cancelled.');
    }

    // Rule: cannot cancel once slot has started
    if (new Date() >= booking.slot.startTime) {
      throw new BadRequestException('Cannot cancel a booking once the slot has started.');
    }

    // Cancel booking + free the slot in a transaction
    // Note: cancellation still counts against weekly frequency limit
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'AVAILABLE' } });

      // Log to wash history
      await tx.washHistory.create({
        data: {
          userId,
          machineId: booking.slot.machineId,
          slotId: booking.slotId,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          status: 'CANCELLED',
        },
      });
    });

    return { message: 'Booking cancelled. This booking counts against your weekly limit.' };
  }

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { slot: { include: { machine: true } } },
      orderBy: { bookedAt: 'desc' },
    });
  }
}
