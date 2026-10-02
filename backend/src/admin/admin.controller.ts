import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { SlotsService } from '../slots/slots.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateBlockedRangeDto } from './dto/create-blocked-range.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly slotsService: SlotsService,
  ) {}

  // ─── Schedules ────────────────────────────────────────────────────────────

  @Get('schedules')
  @ApiOperation({ summary: 'List all active slot schedules' })
  getSchedules() {
    return this.adminService.getSchedules();
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create a new slot schedule' })
  createSchedule(@Body() dto: CreateScheduleDto, @Request() req: any) {
    return this.adminService.createSchedule(dto, req.user.userId);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Deactivate a slot schedule' })
  deactivateSchedule(@Param('id') id: string) {
    return this.adminService.deactivateSchedule(id);
  }

  // ─── Blocked Ranges ───────────────────────────────────────────────────────

  @Get('blocked-ranges')
  @ApiOperation({ summary: 'List all upcoming blocked ranges' })
  getBlockedRanges() {
    return this.adminService.getBlockedRanges();
  }

  @Post('blocked-ranges')
  @ApiOperation({ summary: 'Block a time range from bookings' })
  createBlockedRange(@Body() dto: CreateBlockedRangeDto, @Request() req: any) {
    return this.adminService.createBlockedRange(dto, req.user.userId);
  }

  @Delete('blocked-ranges/:id')
  @ApiOperation({ summary: 'Remove a blocked range and restore affected slots' })
  deleteBlockedRange(@Param('id') id: string) {
    return this.adminService.deleteBlockedRange(id);
  }

  // ─── Slot Generation ──────────────────────────────────────────────────────

  @Post('slots/generate')
  @ApiOperation({ summary: 'Manually trigger slot generation' })
  triggerGeneration() {
    return this.slotsService.triggerGeneration();
  }

  // ─── History ──────────────────────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Get wash history (7d or 30d)' })
  getHistory(@Query('range') range: '7d' | '30d' = '7d') {
    return this.adminService.getHistory(range);
  }

  // ─── Admin Management (super admin only) ──────────────────────────────────

  @Get('admins')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Super admin: list all admins' })
  listAdmins() {
    return this.adminService.listAdmins();
  }

  @Post('admins')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Super admin: add a new admin' })
  addAdmin(@Body() body: { email: string; name: string; password: string }) {
    return this.adminService.addAdmin(body.email, body.name, body.password);
  }

  @Patch('admins/:id/remove')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Super admin: deactivate an admin account' })
  removeAdmin(@Param('id') id: string) {
    return this.adminService.removeAdmin(id);
  }

  // ─── App Config ───────────────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get app config (weekly booking limit)' })
  getConfig() {
    return this.adminService.getAppConfig();
  }

  @Patch('config/weekly-limit')
  @ApiOperation({ summary: 'Update weekly booking frequency limit' })
  updateWeeklyLimit(@Body() body: { limit: number }, @Request() req: any) {
    return this.adminService.updateWeeklyLimit(body.limit, req.user.userId);
  }
}
