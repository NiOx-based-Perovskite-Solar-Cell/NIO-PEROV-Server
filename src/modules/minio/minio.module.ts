import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger/logger.module';
import { MinioController } from './minio.controller';
import { MinioService } from './minio.service';

@Module({
  imports: [LoggerModule],
  controllers: [MinioController],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
