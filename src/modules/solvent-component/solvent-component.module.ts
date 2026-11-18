// solvent-component.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolventComponentController } from './solvent-component.controller';
import { SolventComponentService } from './solvent-component.service';
import { SolventComponent } from './entities/solvent-component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SolventComponent])],
  controllers: [SolventComponentController],
  providers: [SolventComponentService],
  exports: [SolventComponentService],
})
export class SolventComponentModule {}
