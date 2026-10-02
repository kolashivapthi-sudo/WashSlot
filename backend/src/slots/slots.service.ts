import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  addMinutes,
  startOfDay,
  isBefore,
  isAfter,
  addDays,
  getDay,
  format,
  parseISO,
  isEqual,
} from 'date-fns';
import { DayType, SlotStatus } from '@prisma/client';

@Injectable()
export class SlotsService {
  private readonly logger = new Logger(SlotsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── User-facing ──────────────────────────────────────────────────────────

  /**
   * Returns all slots for the next 24 hours, grouped by machine.
   * This is the primary endpoint for the mobile app home screen.
   */
  async getNext24HoursSlots() {
    const now = new Date();
    const end = addDays(now, 1);

    const slots = await this.prisma.slot.findMany({
      where: {
        startTime: { gte: now, lte: end },
        machine: { isActive: true },
      },
      include: { machine: true, booking: { select: { id: true, userId: true } } },
      orderBy: [{ machineId: 'asc' }, { startTime: 'asc' }],
    });

    return slots;
  }

  // ─── Schedule selection logic ─────────────────────────────────────────────

  /**
   * Given a date, picks the best matching schedule:
   * Priority: SPECIFIC date match > HOLIDAY > day-of-week (SUNDAY/WEEKDAY/WEEKEND) > ALL
   */
  private async getScheduleForDate(date: Date) {
    const schedules = await this.prisma.slotSchedule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!schedules.length) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    const dow = getDay(date); // 0=Sun, 1=Mon ... 6=Sat
    const isWeekday = dow >= 1 && dow <= 5;
    const isWeekend = dow === 0 || dow === 6;
    const isSunday = dow === 0;

    // Priority 1: exact SPECIFIC date match
    const specific = schedules.find(
      (s) =>
        s.dayType === DayType.SPECIFIC &&
        s.specificDate &&
        format(s.specificDate, 'yyyy-MM-dd') === dateStr,
    );
    if (specific) return specific;

    // Priority 2: HOLIDAY match
    const holiday = schedules.find(
      (s) =>
        s.dayType === DayType.HOLIDAY &&
        s.specificDate &&
        format(s.specificDate, 'yyyy-MM-dd') === dateStr,
    );
    if (holiday) return holiday;

    // Priority 3: day-type match
    if (isSunday) {
      const sundaySched = schedules.find((s) => s.dayType === DayType.SUNDAY);
      if (sundaySched) return sundaySched;
    }
    if (isWeekday) {
      const weekdaySched = schedules.find((s) => s.dayType === DayType.WEEKDAY);
      if (weekdaySched) return weekdaySched;
    }
    if (isWeekend) {
      const weekendSched = schedules.find((s) => s.dayType === DayType.WEEKEND);
      if (weekendSched) return weekendSched;
    }

    // Priority 4: ALL days fallback
    return schedules.find((s) => s.dayType === DayType.ALL) ?? null;
  }

  // ─── Core slot generation ─────────────────────────────────────────────────

  /**
   * Generates slots for a single day on a single machine using the given schedule.
   * Skips slots that overlap any blocked range.
   * Uses upsert so it is safe to call multiple times.
   */
  private async generateSlotsForDay(
    machineId: string,
    date: Date,
    schedule: { openTime: string; closeTime: string; slotDuration: number; bufferDuration: number },
    blockedRanges: Array<{ startTime: Date; endTime: Date }>,
  ) {
    const dayStart = startOfDay(date);
    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);

    const openTime = addMinutes(dayStart, openH * 60 + openM);
    const closeTime = addMinutes(dayStart, closeH * 60 + closeM);
    const step = schedule.slotDuration + schedule.bufferDuration;

    let cursor = new Date(openTime);
    let created = 0;

    while (true) {
      const slotStart = new Date(cursor);
      const slotEnd = addMinutes(slotStart, schedule.slotDuration);

      // Stop if slot would end after closing time
      if (isAfter(slotEnd, closeTime) || isEqual(slotEnd, closeTime)) break;
      // Stop if we've gone past 24h from now
      if (isAfter(slotStart, addDays(new Date(), 1))) break;
      // Skip slots in the past
      if (isBefore(slotStart, new Date())) {
        cursor = addMinutes(cursor, step);
        continue;
      }

      // Check if this slot falls inside any blocked range
      const isBlocked = blockedRanges.some(
        (b) => slotStart < b.endTime && slotEnd > b.startTime,
      );

      if (!isBlocked) {
        await this.prisma.slot.upsert({
          where: { machineId_startTime: { machineId, startTime: slotStart } },
          update: {}, // never overwrite an existing slot's status
          create: {
            machineId,
            startTime: slotStart,
            endTime: slotEnd,
            status: SlotStatus.AVAILABLE,
          },
        });
        created++;
      }

      cursor = addMinutes(cursor, step);
    }

    return created;
  }

  // ─── Cron: runs every hour ────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async generateSlots() {
    this.logger.log('Running slot generation...');

    const machines = await this.prisma.machine.findMany({
      where: { isActive: true, status: { not: 'UNDER_REPAIR' } },
    });

    if (!machines.length) return;

    // Get blocked ranges relevant to the next 24 hours
    const now = new Date();
    const end = addDays(now, 1);
    const blockedRanges = await this.prisma.blockedRange.findMany({
      where: { startTime: { lte: end }, endTime: { gte: now } },
    });

    // Generate for today and tomorrow (covers the full 24h rolling window)
    const days = [now, addDays(now, 1)];
    let total = 0;

    for (const day of days) {
      const schedule = await this.getScheduleForDate(day);
      if (!schedule) continue;

      for (const machine of machines) {
        const count = await this.generateSlotsForDay(
          machine.id,
          day,
          schedule,
          blockedRanges,
        );
        total += count;
      }
    }

    this.logger.log(`Slot generation complete. Created ${total} new slots.`);
  }

  // ─── Manual trigger (called after admin saves a new schedule) ────────────

  async triggerGeneration() {
    await this.generateSlots();
    return { message: 'Slot generation triggered successfully.' };
  }

  // ─── Admin: list current schedules ───────────────────────────────────────

  async getSchedules() {
    return this.prisma.slotSchedule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: list blocked ranges ───────────────────────────────────────────

  async getBlockedRanges() {
    return this.prisma.blockedRange.findMany({
      where: { endTime: { gte: new Date() } },
      orderBy: { startTime: 'asc' },
    });
  }

  // ─── Admin: delete a blocked range ────────────────────────────────────────

  async deleteBlockedRange(id: string) {
    const range = await this.prisma.blockedRange.delete({ where: { id } });
    // Restore BLOCKED slots that were in this range (only if not booked)
    await this.prisma.slot.updateMany({
      where: {
        startTime: { gte: range.startTime },
        endTime: { lte: range.endTime },
        status: SlotStatus.BLOCKED,
      },
      data: { status: SlotStatus.AVAILABLE },
    });
    return { message: 'Blocked range removed and slots restored.' };
  }

  // ─── Admin: deactivate a schedule ─────────────────────────────────────────

  async deactivateSchedule(id: string) {
    return this.prisma.slotSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
