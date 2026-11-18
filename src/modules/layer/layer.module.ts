// layer.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LayerController } from './layer.controller';
import { LayerService } from './layer.service';
import { Layer } from './entities/layer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Layer])],
  controllers: [LayerController],
  providers: [LayerService],
  exports: [LayerService],
})
export class LayerModule {}
