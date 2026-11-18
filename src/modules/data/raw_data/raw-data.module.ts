// raw-data.module.ts
import { Module } from '@nestjs/common';
import { RawDataController } from './raw-data.controller';
import { RawDataService } from './raw-data.service';

@Module({
  controllers: [RawDataController],
  providers: [RawDataService],
  exports: [RawDataService],
})
export class RawDataModule {}
