// solvent-system-detail.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolventSystemDetailController } from './solvent-system-detail.controller';
import { SolventSystemDetailService } from './solvent-system-detail.service';
import { SolventSystem } from '../../solvent-system/entities/solvent-system.entity';
import { SolventComponent } from '../../solvent-component/entities/solvent-component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SolventSystem, SolventComponent])],
  controllers: [SolventSystemDetailController],
  providers: [SolventSystemDetailService],
  exports: [SolventSystemDetailService],
})
export class SolventSystemDetailModule {}
