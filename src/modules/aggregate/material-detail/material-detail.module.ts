// material-detail.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialDetailController } from './material-detail.controller';
import { MaterialDetailService } from './material-detail.service';
import { Material } from '../../material/entities/material.entity';
import { PerovskiteComposition } from '../../perovskite-composition/entities/perovskite-composition.entity';
import { MaterialSource } from '../../material-source/entities/material-source.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, PerovskiteComposition, MaterialSource]),
  ],
  controllers: [MaterialDetailController],
  providers: [MaterialDetailService],
  exports: [MaterialDetailService],
})
export class MaterialDetailModule {}
