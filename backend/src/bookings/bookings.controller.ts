import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(':slotId')
  book(@Request() req: any, @Param('slotId') slotId: string) {
    return this.bookingsService.book(req.user.userId, slotId);
  }

  @Delete(':bookingId')
  cancel(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancel(req.user.userId, bookingId);
  }

  @Get('my')
  myBookings(@Request() req: any) {
    return this.bookingsService.getUserBookings(req.user.userId);
  }
}
