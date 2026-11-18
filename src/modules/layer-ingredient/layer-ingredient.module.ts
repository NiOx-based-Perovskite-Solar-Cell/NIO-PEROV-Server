// layer-ingredient.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LayerIngredientController } from './layer-ingredient.controller';
import { LayerIngredientService } from './layer-ingredient.service';
import { LayerIngredient } from './entities/layer-ingredient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LayerIngredient])],
  controllers: [LayerIngredientController],
  providers: [LayerIngredientService],
  exports: [LayerIngredientService],
})
export class LayerIngredientModule {}
