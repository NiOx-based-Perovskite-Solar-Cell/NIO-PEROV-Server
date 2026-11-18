// device.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { Paper } from '../../paper/entities/paper.entity';
import { Sample } from '../../sample/entities/sample.entity';
import { Layer } from '../../layer/entities/layer.entity';
import { LayerIngredient } from '../../layer-ingredient/entities/layer-ingredient.entity';
import { ProcessStep } from '../../process-step/entities/process-step.entity';
import { ProcessParam } from '../../process-param/entities/process-param.entity';
import { Measurement } from '../../measurement/entities/measurement.entity';
import { StabilityTest } from '../../stability-test/entities/stability-test.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paper,
      Sample,
      Layer,
      LayerIngredient,
      ProcessStep,
      ProcessParam,
      Measurement,
      StabilityTest,
    ]),
  ],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
