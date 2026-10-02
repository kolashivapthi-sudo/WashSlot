import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(':slotId')
  @ApiOperation({ summary: 'Book an available slot' })
  book(@Request() req: any, @Param('slotId') slotId: string) {
    return this.bookingsService.book(req.user.userId, slotId);
  }

  @Delete(':bookingId')
  @ApiOperation({ summary: 'Cancel a confirmed booking (before slot starts)' })
  cancel(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancel(req.user.userId, bookingId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all bookings for the logged-in user' })
  myBookings(@Request() req: any) {
    return this.bookingsService.getUserBookings(req.user.userId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the current user\'s active/upcoming booking (if any)' })
  activeBooking(@Request() req: any) {
    return this.bookingsService.getActiveBooking(req.user.userId);
  }
}
