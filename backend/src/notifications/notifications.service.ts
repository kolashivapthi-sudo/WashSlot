import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addMinutes, subMinutes } from 'date-fns';

// TODO Phase 7: Initialize firebase-admin with service account key
// import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send push notification to a user's device via FCM.
   * Placeholder until Firebase service account is configured.
   */
  async sendPush(fcmToken: string, title: string, body: string) {
    if (!fcmToken) return;
    // TODO Phase 7: Replace with actual FCM send
    this.logger.log(`[FCM] To: ${fcmToken} | ${title}: ${body}`);
  }

  /**
   * Cron: runs every minute — sends T-30 and T-5 reminders
   */
  @Cron('* * * * *')
  async sendSlotReminders() {
    const now = new Date();

    // T-30 reminder
    const thirtyMinFromNow = addMinutes(now, 30);
    const thirtyMinWindow = addMinutes(now, 31);

    const upcomingIn30 = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        slot: {
          startTime: { gte: thirtyMinFromNow, lt: thirtyMinWindow },
        },
      },
      include: {
        user: true,
        slot: { include: { machine: true } },
      },
    });

    for (const booking of upcomingIn30) {
      if (booking.user.fcmToken) {
        await this.sendPush(
          booking.user.fcmToken,
          '⏰ Slot in 30 minutes',
          `Your slot on ${booking.slot.machine.name} starts at ${booking.slot.startTime.toLocaleTimeString()}. Cancel now if you can't make it.`,
        );
      }
    }

    // T-5 reminder
    const fiveMinFromNow = addMinutes(now, 5);
    const fiveMinWindow = addMinutes(now, 6);

    const upcomingIn5 = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        slot: {
          startTime: { gte: fiveMinFromNow, lt: fiveMinWindow },
        },
      },
      include: {
        user: true,
        slot: { include: { machine: true } },
      },
    });

    for (const booking of upcomingIn5) {
      if (booking.user.fcmToken) {
        await this.sendPush(
          booking.user.fcmToken,
          '🧺 Your slot starts in 5 minutes!',
          `Head to ${booking.slot.machine.name} now. Your slot starts soon.`,
        );
      }
    }
  }
}
