// process-param.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessParamController } from './process-param.controller';
import { ProcessParamService } from './process-param.service';
import { ProcessParam } from './entities/process-param.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessParam])],
  controllers: [ProcessParamController],
  providers: [ProcessParamService],
  exports: [ProcessParamService],
})
export class ProcessParamModule {}
