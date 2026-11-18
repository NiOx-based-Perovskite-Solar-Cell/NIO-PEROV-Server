// paper.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaperController } from './paper.controller';
import { PaperService } from './paper.service';
import { Paper } from './entities/paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Paper])],
  controllers: [PaperController],
  providers: [PaperService],
  exports: [PaperService],
})
export class PaperModule {}
