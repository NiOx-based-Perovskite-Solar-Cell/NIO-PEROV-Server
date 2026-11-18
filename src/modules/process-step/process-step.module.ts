// process-step.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStepController } from './process-step.controller';
import { ProcessStepService } from './process-step.service';
import { ProcessStep } from './entities/process-step.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessStep])],
  controllers: [ProcessStepController],
  providers: [ProcessStepService],
  exports: [ProcessStepService],
})
export class ProcessStepModule {}
