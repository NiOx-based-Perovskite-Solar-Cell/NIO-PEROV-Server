// paper-detail.module.ts
import { Module } from '@nestjs/common';
import { PaperDetailController } from './paper-detail.controller';
import { PaperDetailService } from './paper-detail.service';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  controllers: [PaperDetailController],
  providers: [PaperDetailService],
  exports: [PaperDetailService],
})
export class PaperDetailModule {}
