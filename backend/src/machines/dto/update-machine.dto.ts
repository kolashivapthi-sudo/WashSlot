import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMachineDto {
  @ApiProperty({ example: 'Machine 2', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'First floor laundry room', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
