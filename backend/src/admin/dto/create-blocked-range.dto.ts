import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BlockDayTypeDto {
  SPECIFIC = 'SPECIFIC',
  ALL = 'ALL',
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  SUNDAY = 'SUNDAY',
  HOLIDAY = 'HOLIDAY',
}

export class CreateBlockedRangeDto {
  @ApiProperty({ example: '2026-10-05T06:00:00.000Z' })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ example: '2026-10-05T09:00:00.000Z' })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ example: 'College event — no laundry', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ enum: BlockDayTypeDto, example: BlockDayTypeDto.SPECIFIC })
  @IsEnum(BlockDayTypeDto)
  dayType: BlockDayTypeDto;
}
