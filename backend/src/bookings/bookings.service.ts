import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays } from 'date-fns';
import { BookingStatus, SlotStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Book a slot ──────────────────────────────────────────────────────────

  async book(userId: string, slotId: string) {
    // Fetch slot with machine in one query
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { machine: true },
    });

    if (!slot) throw new NotFoundException('Slot not found.');

    // Guard: slot must be available
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException(
        slot.status === SlotStatus.BOOKED
          ? 'This slot has already been booked by someone else.'
          : 'This slot is not available for booking.',
      );
    }

    // Guard: machine must not be under repair
    if (slot.machine.status === 'UNDER_REPAIR') {
      throw new BadRequestException('This machine is under repair. Booking is not allowed.');
    }

    // Guard: slot must not be in the past
    if (new Date() >= slot.startTime) {
      throw new BadRequestException('Cannot book a slot that has already started or passed.');
    }

    // Guard: user can only have one upcoming booking at a time
    // (can book next only after current slot's endTime has passed)
    const existingUpcoming = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        slot: { endTime: { gt: new Date() } },
      },
      include: { slot: true },
    });

    if (existingUpcoming) {
      const slotTime = existingUpcoming.slot.startTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new BadRequestException(
        `You already have a booking at ${slotTime}. You can only book your next slot after your current one ends.`,
      );
    }

    // Guard: rolling 7-day frequency limit
    const appConfig = await this.prisma.appConfig.findFirst();
    const weeklyLimit = appConfig?.weeklyBookingLimit ?? 3;
    const sevenDaysAgo = subDays(new Date(), 7);

    const recentCount = await this.prisma.booking.count({
      where: {
        userId,
        countsAgainstLimit: true,
        bookedAt: { gte: sevenDaysAgo },
      },
    });

    if (recentCount >= weeklyLimit) {
      throw new BadRequestException(
        `Weekly limit reached (${weeklyLimit} bookings per 7 days). Your oldest booking will fall off the limit soon.`,
      );
    }

    // All checks passed — create booking in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          slotId,
          status: BookingStatus.CONFIRMED,
          countsAgainstLimit: true,
        },
        include: { slot: { include: { machine: true } } },
      });

      await tx.slot.update({
        where: { id: slotId },
        data: { status: SlotStatus.BOOKED },
      });

      return newBooking;
    });

    return booking;
  }

  // ─── Cancel a booking ─────────────────────────────────────────────────────

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { machine: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking.');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel a booking with status "${booking.status}".`,
      );
    }

    // Guard: cannot cancel once slot has started
    if (new Date() >= booking.slot.startTime) {
      throw new BadRequestException(
        'Your slot has already started. Cancellation is no longer allowed.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Cancel the booking — still counts against weekly limit
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          countsAgainstLimit: true, // explicit: cancellation still counts
        },
      });

      // Free the slot
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      // Log to wash history
      await tx.washHistory.create({
        data: {
          userId,
          machineId: booking.slot.machineId,
          slotId: booking.slotId,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          status: BookingStatus.CANCELLED,
        },
      });
    });

    return { message: 'Booking cancelled. Note: this still counts against your weekly limit.' };
  }

  // ─── Mark booking as completed ────────────────────────────────────────────
  // Called by cron (Phase 7) after slot end time passes

  async complete(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED, completedAt: new Date() },
      });

      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: SlotStatus.COMPLETED },
      });

      // Log to wash history
      await tx.washHistory.create({
        data: {
          userId: booking.userId,
          machineId: booking.slot.machineId,
          slotId: booking.slotId,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          status: BookingStatus.COMPLETED,
        },
      });
    });
  }

  // ─── Mark as no-show ──────────────────────────────────────────────────────
  // Called by cron after grace period (slot start + 15 min, no completion)

  async markNoShow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.NO_SHOW, noShowAt: new Date() },
      });

      // Release the slot so others can see it as available
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      // Log to wash history
      await tx.washHistory.create({
        data: {
          userId: booking.userId,
          machineId: booking.slot.machineId,
          slotId: booking.slotId,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          status: BookingStatus.NO_SHOW,
        },
      });

      // Increment user's no-show count
      await tx.user.update({
        where: { id: booking.userId },
        data: { noShowCount: { increment: 1 } },
      });
    });
  }

  // ─── Get user's bookings ──────────────────────────────────────────────────

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: { machine: true },
        },
      },
      orderBy: { bookedAt: 'desc' },
    });
  }

  // ─── Get user's active booking ────────────────────────────────────────────

  async getActiveBooking(userId: string) {
    return this.prisma.booking.findFirst({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        slot: { endTime: { gt: new Date() } },
      },
      include: { slot: { include: { machine: true } } },
    });
  }
}
