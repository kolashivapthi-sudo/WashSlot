import { Controller, Post, Patch, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Machines ───────────────────────────────

  @Post('machines')
  @Roles('ADMIN', 'SUPER_ADMIN')
  addMachine(@Body() body: { name: string; description?: string }) {
    return this.adminService.addMachine(body.name, body.description);
  }

  @Patch('machines/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  setMachineStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminService.setMachineStatus(id, body.status as any);
  }

  // ─── Schedule ───────────────────────────────

  @Post('schedule')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSchedule(@Body() body: any, @Request() req: any) {
    return this.adminService.updateSchedule({ ...body, adminId: req.user.userId });
  }

  // ─── Block Ranges ────────────────────────────

  @Post('block')
  @Roles('ADMIN', 'SUPER_ADMIN')
  blockRange(@Body() body: any, @Request() req: any) {
    return this.adminService.blockRange({ ...body, adminId: req.user.userId });
  }

  // ─── History ────────────────────────────────

  @Get('history')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getHistory(@Query('range') range: '7d' | '30d' = '7d') {
    return this.adminService.getHistory(range);
  }

  // ─── Admin Management (super admin only) ────

  @Post('admins')
  @Roles('SUPER_ADMIN')
  addAdmin(@Body() body: { email: string; name: string; password: string }, @Request() req: any) {
    return this.adminService.addAdmin(body.email, body.name, body.password, req.user.userId);
  }

  @Patch('admins/:id/remove')
  @Roles('SUPER_ADMIN')
  removeAdmin(@Param('id') id: string) {
    return this.adminService.removeAdmin(id);
  }

  // ─── App Config ─────────────────────────────

  @Patch('config/weekly-limit')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateWeeklyLimit(@Body() body: { limit: number }, @Request() req: any) {
    return this.adminService.updateWeeklyLimit(body.limit, req.user.userId);
  }
}
