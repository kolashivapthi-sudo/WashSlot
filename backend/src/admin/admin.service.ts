import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays } from 'date-fns';
import { MachineStatus, Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Machine Management ───────────────────────────────

  async addMachine(name: string, description?: string) {
    return this.prisma.machine.create({ data: { name, description } });
  }

  async setMachineStatus(machineId: string, status: MachineStatus) {
    return this.prisma.machine.update({ where: { id: machineId }, data: { status } });
  }

  // ─── Slot Schedule Config ─────────────────────────────

  async updateSchedule(data: {
    openTime: string;
    closeTime: string;
    slotDuration: number;
    bufferDuration: number;
    dayType: string;
    specificDate?: Date;
    adminId: string;
  }) {
    return this.prisma.slotSchedule.create({
      data: {
        openTime: data.openTime,
        closeTime: data.closeTime,
        slotDuration: data.slotDuration,
        bufferDuration: data.bufferDuration,
        dayType: data.dayType as any,
        specificDate: data.specificDate,
        createdBy: data.adminId,
      },
    });
  }

  // ─── Block Time Range ────────────────────────────────

  async blockRange(data: {
    startTime: Date;
    endTime: Date;
    reason?: string;
    dayType: string;
    adminId: string;
  }) {
    // Mark all slots in this range as BLOCKED
    await this.prisma.slot.updateMany({
      where: {
        startTime: { gte: data.startTime },
        endTime: { lte: data.endTime },
        status: 'AVAILABLE',
      },
      data: { status: 'BLOCKED' },
    });

    return this.prisma.blockedRange.create({
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        dayType: data.dayType as any,
        createdBy: data.adminId,
      },
    });
  }

  // ─── Wash History / Reports ───────────────────────────

  async getHistory(range: '7d' | '30d') {
    const days = range === '7d' ? 7 : 30;
    const since = subDays(new Date(), days);

    return this.prisma.washHistory.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin Management (super admin only) ─────────────

  async addAdmin(email: string, name: string, password: string, superAdminId: string) {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: { email, name, passwordHash, role: Role.ADMIN },
    });
  }

  async removeAdmin(adminId: string) {
    return this.prisma.user.update({
      where: { id: adminId },
      data: { isActive: false },
    });
  }

  // ─── App Config ───────────────────────────────────────

  async updateWeeklyLimit(limit: number, adminId: string) {
    const config = await this.prisma.appConfig.findFirst();
    if (config) {
      return this.prisma.appConfig.update({
        where: { id: config.id },
        data: { weeklyBookingLimit: limit, updatedBy: adminId },
      });
    }
    return this.prisma.appConfig.create({
      data: { weeklyBookingLimit: limit, updatedBy: adminId },
    });
  }
}
