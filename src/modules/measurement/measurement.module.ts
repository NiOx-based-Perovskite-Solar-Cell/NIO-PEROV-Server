// measurement.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';
import { Measurement } from './entities/measurement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Measurement])],
  controllers: [MeasurementController],
  providers: [MeasurementService],
  exports: [MeasurementService],
})
export class MeasurementModule {}
