// stability-test.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StabilityTestController } from './stability-test.controller';
import { StabilityTestService } from './stability-test.service';
import { StabilityTest } from './entities/stability-test.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StabilityTest])],
  controllers: [StabilityTestController],
  providers: [StabilityTestService],
  exports: [StabilityTestService],
})
export class StabilityTestModule {}
