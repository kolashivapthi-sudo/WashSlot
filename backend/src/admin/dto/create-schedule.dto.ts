import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DayTypeDto {
  ALL = 'ALL',
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  SUNDAY = 'SUNDAY',
  HOLIDAY = 'HOLIDAY',
  SPECIFIC = 'SPECIFIC',
}

export class CreateScheduleDto {
  @ApiProperty({ example: '06:00', description: 'Opening time in HH:mm 24hr format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:mm format (e.g. 06:00)' })
  openTime: string;

  @ApiProperty({ example: '22:00', description: 'Closing time in HH:mm 24hr format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:mm format (e.g. 22:00)' })
  closeTime: string;

  @ApiProperty({ example: 30, description: 'Slot duration in minutes' })
  @IsInt()
  @Min(15, { message: 'Slot duration must be at least 15 minutes.' })
  @Max(120, { message: 'Slot duration must be at most 120 minutes.' })
  slotDuration: number;

  @ApiProperty({ example: 10, description: 'Buffer between slots in minutes' })
  @IsInt()
  @Min(0)
  @Max(60)
  bufferDuration: number;

  @ApiProperty({ enum: DayTypeDto, example: DayTypeDto.ALL })
  @IsEnum(DayTypeDto, { message: 'dayType must be ALL, WEEKDAY, WEEKEND, SUNDAY, HOLIDAY, or SPECIFIC' })
  dayType: DayTypeDto;

  @ApiProperty({
    example: '2026-12-25',
    required: false,
    description: 'Required when dayType is SPECIFIC or HOLIDAY',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'specificDate must be in YYYY-MM-DD format' })
  specificDate?: string;
}
