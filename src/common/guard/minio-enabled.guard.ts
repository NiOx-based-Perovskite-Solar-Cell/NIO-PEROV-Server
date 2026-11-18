import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { minioConfig } from '../config/minio.config';

/** ปิด endpoint ที่ต้องใช้ MinIO เมื่อตั้ง USE_MINIO=false */
@Injectable()
export class MinioEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!minioConfig.enabled) {
      throw new ServiceUnavailableException(
        'File storage is disabled (USE_MINIO=false)',
      );
    }
    return true;
  }
}
