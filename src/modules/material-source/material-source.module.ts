// material-source.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialSourceController } from './material-source.controller';
import { MaterialSourceService } from './material-source.service';
import { MaterialSource } from './entities/material-source.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialSource])],
  controllers: [MaterialSourceController],
  providers: [MaterialSourceService],
  exports: [MaterialSourceService],
})
export class MaterialSourceModule {}
