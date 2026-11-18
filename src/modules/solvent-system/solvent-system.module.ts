// solvent-system.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolventSystemController } from './solvent-system.controller';
import { SolventSystemService } from './solvent-system.service';
import { SolventSystem } from './entities/solvent-system.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SolventSystem])],
  controllers: [SolventSystemController],
  providers: [SolventSystemService],
  exports: [SolventSystemService],
})
export class SolventSystemModule {}
