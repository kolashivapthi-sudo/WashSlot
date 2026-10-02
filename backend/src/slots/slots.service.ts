import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addMinutes, startOfDay, isAfter, isBefore, addDays } from 'date-fns';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all slots for the next 24 hours across all active machines
   */
  async getNext24HoursSlots() {
    const now = new Date();
    const end = addDays(now, 1);

    return this.prisma.slot.findMany({
      where: {
        startTime: { gte: now, lte: end },
        machine: { isActive: true },
      },
      include: { machine: true },
      orderBy: [{ machineId: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Generate slots for next 24 hours based on active schedule config.
   * Called by cron job every hour and on app start.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generateSlots() {
    const schedules = await this.prisma.slotSchedule.findMany({ where: { isActive: true } });
    const machines = await this.prisma.machine.findMany({ where: { isActive: true } });
    const blockedRanges = await this.prisma.blockedRange.findMany();
    const appConfig = await this.prisma.appConfig.findFirst();

    if (!schedules.length || !machines.length) return;

    // Use the first active schedule (TODO: per-day schedule selection in Phase 4)
    const schedule = schedules[0];
    const slotDuration = schedule.slotDuration;
    const buffer = schedule.bufferDuration;
    const step = slotDuration + buffer; // total block per slot

    const now = new Date();
    const generationEnd = addDays(now, 1);

    for (const machine of machines) {
      // Generate slots from now until 24h ahead
      let cursor = new Date(now);
      cursor.setMinutes(0, 0, 0); // align to hour

      while (isBefore(cursor, generationEnd)) {
        const slotStart = cursor;
        const slotEnd = addMinutes(slotStart, slotDuration);

        // Check if slot is within operating hours
        const [openH, openM] = schedule.openTime.split(':').map(Number);
        const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
        const dayStart = startOfDay(slotStart);
        const openTime = addMinutes(dayStart, openH * 60 + openM);
        const closeTime = addMinutes(dayStart, closeH * 60 + closeM);

        if (isAfter(slotStart, openTime) || slotStart >= openTime) {
          if (isBefore(slotEnd, closeTime) || slotEnd <= closeTime) {
            // Check not in a blocked range
            const isBlocked = blockedRanges.some(
              (b) => slotStart < b.endTime && slotEnd > b.startTime,
            );

            if (!isBlocked) {
              // Upsert — don't duplicate existing slots
              await this.prisma.slot.upsert({
                where: { machineId_startTime: { machineId: machine.id, startTime: slotStart } },
                update: {},
                create: {
                  machineId: machine.id,
                  startTime: slotStart,
                  endTime: slotEnd,
                  status: 'AVAILABLE',
                },
              });
            }
          }
        }

        cursor = addMinutes(cursor, step);
      }
    }
  }
}
