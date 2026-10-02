import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '21071A0501@bvrithyderabad.edu.in' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @ApiProperty({ example: 'Shiva Apthi' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Name must be under 100 characters.' })
  name: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  @MaxLength(64, { message: 'Password must be under 64 characters.' })
  password: string;
}
