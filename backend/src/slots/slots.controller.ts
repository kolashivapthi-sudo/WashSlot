import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/jwt-auth.guard';
import { SlotsService } from './slots.service';

@ApiTags('Slots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  // ─── User routes ──────────────────────────────────────────────────────────

  @Get('next24')
  @ApiOperation({ summary: 'Get all slots for the next 24 hours (all machines)' })
  getNext24Hours() {
    return this.slotsService.getNext24HoursSlots();
  }

  // ─── Admin routes ─────────────────────────────────────────────────────────

  @Get('schedules')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: list active slot schedules' })
  getSchedules() {
    return this.slotsService.getSchedules();
  }

  @Get('blocked-ranges')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: list active blocked time ranges' })
  getBlockedRanges() {
    return this.slotsService.getBlockedRanges();
  }

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: manually trigger slot generation' })
  triggerGeneration() {
    return this.slotsService.triggerGeneration();
  }

  @Delete('blocked-ranges/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: remove a blocked range and restore those slots' })
  deleteBlockedRange(@Param('id') id: string) {
    return this.slotsService.deleteBlockedRange(id);
  }

  @Delete('schedules/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: deactivate a slot schedule' })
  deactivateSchedule(@Param('id') id: string) {
    return this.slotsService.deactivateSchedule(id);
  }
}
