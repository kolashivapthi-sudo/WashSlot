import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/jwt-auth.guard';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { SetMachineStatusDto } from './dto/set-machine-status.dto';

@ApiTags('Machines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  // ─── User routes (any authenticated user) ────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all active machines with current status' })
  findAll() {
    return this.machinesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single machine by ID' })
  findById(@Param('id') id: string) {
    return this.machinesService.findById(id);
  }

  // ─── Admin routes ─────────────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: list all machines including inactive' })
  findAllAdmin() {
    return this.machinesService.findAllAdmin();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: add a new washing machine' })
  create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: update machine name or description' })
  update(@Param('id') id: string, @Body() dto: UpdateMachineDto) {
    return this.machinesService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: set machine status (AVAILABLE, IN_USE, UNDER_REPAIR)' })
  setStatus(@Param('id') id: string, @Body() dto: SetMachineStatusDto) {
    return this.machinesService.setStatus(id, dto.status);
  }

  @Patch(':id/toggle-repair')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: toggle machine between AVAILABLE and UNDER_REPAIR' })
  toggleRepair(@Param('id') id: string) {
    return this.machinesService.toggleRepair(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: deactivate (soft delete) a machine' })
  deactivate(@Param('id') id: string) {
    return this.machinesService.deactivate(id);
  }
}
