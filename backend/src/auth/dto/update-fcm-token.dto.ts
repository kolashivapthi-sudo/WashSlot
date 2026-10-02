import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'firebase-device-token-here' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
