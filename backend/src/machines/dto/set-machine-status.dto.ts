import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MachineStatus } from '@prisma/client';

export class SetMachineStatusDto {
  @ApiProperty({ enum: MachineStatus, example: MachineStatus.UNDER_REPAIR })
  @IsEnum(MachineStatus, { message: 'Status must be AVAILABLE, IN_USE, or UNDER_REPAIR.' })
  @IsNotEmpty()
  status: MachineStatus;
}
