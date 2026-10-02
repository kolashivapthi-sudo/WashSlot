import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, parseISO } from 'date-fns';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateBlockedRangeDto } from './dto/create-blocked-range.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Slot Schedule ────────────────────────────────────────────────────────

  async createSchedule(dto: CreateScheduleDto, adminId: string) {
    // Validate openTime < closeTime
    const [oh, om] = dto.openTime.split(':').map(Number);
    const [ch, cm] = dto.closeTime.split(':').map(Number);
    if (oh * 60 + om >= ch * 60 + cm) {
      throw new BadRequestException('openTime must be earlier than closeTime.');
    }

    const specificDate = dto.specificDate ? parseISO(dto.specificDate) : undefined;

    // SPECIFIC and HOLIDAY require a date
    if ((dto.dayType === 'SPECIFIC' || dto.dayType === 'HOLIDAY') && !specificDate) {
      throw new BadRequestException(`specificDate is required when dayType is ${dto.dayType}.`);
    }

    const schedule = await this.prisma.slotSchedule.create({
      data: {
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        slotDuration: dto.slotDuration,
        bufferDuration: dto.bufferDuration,
        dayType: dto.dayType as any,
        specificDate,
        createdBy: adminId,
      },
    });

    return schedule;
  }

  async getSchedules() {
    return this.prisma.slotSchedule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivateSchedule(id: string) {
    return this.prisma.slotSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Blocked Ranges ───────────────────────────────────────────────────────

  async createBlockedRange(dto: CreateBlockedRangeDto, adminId: string) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    // Mark all currently AVAILABLE slots in this range as BLOCKED
    await this.prisma.slot.updateMany({
      where: {
        startTime: { gte: dto.startTime },
        endTime: { lte: dto.endTime },
        status: 'AVAILABLE',
      },
      data: { status: 'BLOCKED' },
    });

    return this.prisma.blockedRange.create({
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
        dayType: dto.dayType as any,
        createdBy: adminId,
      },
    });
  }

  async getBlockedRanges() {
    return this.prisma.blockedRange.findMany({
      where: { endTime: { gte: new Date() } },
      orderBy: { startTime: 'asc' },
    });
  }

  async deleteBlockedRange(id: string) {
    const range = await this.prisma.blockedRange.delete({ where: { id } });
    // Restore slots that were blocked by this range
    await this.prisma.slot.updateMany({
      where: {
        startTime: { gte: range.startTime },
        endTime: { lte: range.endTime },
        status: 'BLOCKED',
      },
      data: { status: 'AVAILABLE' },
    });
    return { message: 'Blocked range removed. Affected slots are now available.' };
  }

  // ─── Wash History / Reports ───────────────────────────────────────────────

  async getHistory(range: '7d' | '30d') {
    const days = range === '7d' ? 7 : 30;
    const since = subDays(new Date(), days);
    return this.prisma.washHistory.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin Management (super admin only) ─────────────────────────────────

  async addAdmin(email: string, name: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('An account with this email already exists.');
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: { email, name, passwordHash, role: Role.ADMIN },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async listAdmins() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAdmin(adminId: string) {
    return this.prisma.user.update({
      where: { id: adminId },
      data: { isActive: false },
      select: { id: true, email: true, name: true, isActive: true },
    });
  }

  // ─── App Config ───────────────────────────────────────────────────────────

  async getAppConfig() {
    return this.prisma.appConfig.findFirst();
  }

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
