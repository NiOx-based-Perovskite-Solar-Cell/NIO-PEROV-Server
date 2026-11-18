// perovskite-composition.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerovskiteCompositionController } from './perovskite-composition.controller';
import { PerovskiteCompositionService } from './perovskite-composition.service';
import { PerovskiteComposition } from './entities/perovskite-composition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PerovskiteComposition])],
  controllers: [PerovskiteCompositionController],
  providers: [PerovskiteCompositionService],
  exports: [PerovskiteCompositionService],
})
export class PerovskiteCompositionModule {}
