// process-type.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessTypeController } from './process-type.controller';
import { ProcessTypeService } from './process-type.service';
import { ProcessType } from './entities/process-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessType])],
  controllers: [ProcessTypeController],
  providers: [ProcessTypeService],
  exports: [ProcessTypeService],
})
export class ProcessTypeModule {}
