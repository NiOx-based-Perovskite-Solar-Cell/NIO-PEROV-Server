export interface MinioConfig {
  enabled: boolean;
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  maxFileSizeBytes: number;
  defaultPresignedUrlExpirySeconds: number;
}

// ใช้ getter เพื่ออ่าน process.env ตอนเรียกใช้ ไม่ใช่ตอน import
// (ไฟล์นี้ถูก import ก่อน ConfigModule.forRoot() โหลด .env -> ถ้าอ่านตอน import จะได้ค่า default)
export const minioConfig: MinioConfig = {
  // USE_MINIO=false = ไม่ใช้ MinIO: ไม่ต่อตอน start และ endpoint ที่ใช้ไฟล์ตอบ 503
  get enabled() {
    return process.env.USE_MINIO !== 'false';
  },
  get endPoint() {
    return process.env.MINIO_ENDPOINT || 'localhost';
  },
  get port() {
    return parseInt(process.env.MINIO_PORT || '9000', 10);
  },
  get useSSL() {
    return process.env.MINIO_USE_SSL === 'true';
  },
  get accessKey() {
    return process.env.MINIO_ACCESS_KEY || 'admin';
  },
  get secretKey() {
    return process.env.MINIO_SECRET_KEY || 'password123';
  },
  get bucketName() {
    return process.env.MINIO_BUCKET_NAME || 'nio-perov-files';
  },
  get maxFileSizeBytes() {
    return (
      parseInt(process.env.MINIO_MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024
    );
  },
  get defaultPresignedUrlExpirySeconds() {
    return parseInt(
      process.env.MINIO_PRESIGNED_URL_EXPIRY_SECONDS || '3600',
      10,
    );
  },
};
