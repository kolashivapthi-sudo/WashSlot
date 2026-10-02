import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'Machine 1' })
  @IsString()
  @IsNotEmpty({ message: 'Machine name is required.' })
  @MinLength(1)
  @MaxLength(100, { message: 'Name must be under 100 characters.' })
  name: string;

  @ApiProperty({ example: 'Ground floor, near main entrance', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Description must be under 255 characters.' })
  description?: string;
}
