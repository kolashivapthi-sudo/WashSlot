import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MachinesModule } from '../machines/machines.module';
import { SlotsModule } from '../slots/slots.module';

@Module({
  imports: [MachinesModule, SlotsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
