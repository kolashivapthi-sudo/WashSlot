import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MachineStatus } from '@prisma/client';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User-facing ──────────────────────────────────────────────────────────

  /**
   * Returns all active machines with their current status.
   * Used by mobile app to show the machine list on home screen.
   */
  async findAll() {
    return this.prisma.machine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const machine = await this.prisma.machine.findUnique({ where: { id } });
    if (!machine) throw new NotFoundException('Machine not found.');
    return machine;
  }

  // ─── Admin: Create ────────────────────────────────────────────────────────

  async create(dto: CreateMachineDto) {
    // Prevent duplicate machine names
    const existing = await this.prisma.machine.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, isActive: true },
    });
    if (existing) {
      throw new ConflictException(`A machine named "${dto.name}" already exists.`);
    }

    return this.prisma.machine.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    });
  }

  // ─── Admin: Update name/description ──────────────────────────────────────

  async update(id: string, dto: UpdateMachineDto) {
    await this.findById(id); // throws 404 if not found

    if (dto.name) {
      // Check for name collision with another machine
      const existing = await this.prisma.machine.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          isActive: true,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`A machine named "${dto.name}" already exists.`);
      }
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
      },
    });
  }

  // ─── Admin: Set status ────────────────────────────────────────────────────

  async setStatus(id: string, status: MachineStatus) {
    const machine = await this.findById(id);

    if (machine.status === status) {
      throw new BadRequestException(`Machine is already set to "${status}".`);
    }

    const updated = await this.prisma.machine.update({
      where: { id },
      data: { status },
    });

    // When marking as UNDER_REPAIR — block all future available slots for this machine
    if (status === MachineStatus.UNDER_REPAIR) {
      await this.prisma.slot.updateMany({
        where: {
          machineId: id,
          startTime: { gte: new Date() },
          status: 'AVAILABLE',
        },
        data: { status: 'BLOCKED' },
      });
    }

    // When marking back to AVAILABLE after repair — restore blocked slots (no bookings affected)
    if (status === MachineStatus.AVAILABLE) {
      await this.prisma.slot.updateMany({
        where: {
          machineId: id,
          startTime: { gte: new Date() },
          status: 'BLOCKED',
        },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  }

  // ─── Admin: Toggle repair ─────────────────────────────────────────────────

  async toggleRepair(id: string) {
    const machine = await this.findById(id);
    const newStatus =
      machine.status === MachineStatus.UNDER_REPAIR
        ? MachineStatus.AVAILABLE
        : MachineStatus.UNDER_REPAIR;
    return this.setStatus(id, newStatus);
  }

  // ─── Admin: Soft delete (deactivate) ─────────────────────────────────────

  async deactivate(id: string) {
    await this.findById(id);

    // Block all future slots before deactivating
    await this.prisma.slot.updateMany({
      where: {
        machineId: id,
        startTime: { gte: new Date() },
        status: { in: ['AVAILABLE'] },
      },
      data: { status: 'BLOCKED' },
    });

    return this.prisma.machine.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Admin: List all (including inactive) ────────────────────────────────

  async findAllAdmin() {
    return this.prisma.machine.findMany({ orderBy: { name: 'asc' } });
  }
}
