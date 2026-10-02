import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '21071A0501@bvrithyderabad.edu.in' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
