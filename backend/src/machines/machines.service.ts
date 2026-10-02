import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MachineStatus } from '@prisma/client';

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.machine.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    const machine = await this.prisma.machine.findUnique({ where: { id } });
    if (!machine) throw new NotFoundException('Machine not found.');
    return machine;
  }

  async create(name: string, description?: string) {
    return this.prisma.machine.create({ data: { name, description } });
  }

  async setStatus(id: string, status: MachineStatus) {
    return this.prisma.machine.update({ where: { id }, data: { status } });
  }

  async deactivate(id: string) {
    return this.prisma.machine.update({ where: { id }, data: { isActive: false } });
  }
}
