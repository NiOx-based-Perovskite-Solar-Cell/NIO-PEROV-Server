import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Client as MinioClient, S3Error } from 'minio';
import type { BucketItem, BucketItemStat } from 'minio';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { minioConfig } from '../../common/config/minio.config';
import { AppLogger } from '../../common/logger/app-logger.service';
import { BaseResponse } from '../../common/utils/baseResponse';

export interface UploadedFileResult {
  objectKey: string;
  originalName: string;
  size: number;
  mimeType: string;
  etag: string;
}

export interface MinioObjectInfo {
  objectKey: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface ListObjectsResult {
  objects: MinioObjectInfo[];
  nextStartAfter?: string;
  hasMore: boolean;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly client: MinioClient;
  private readonly bucketName: string = minioConfig.bucketName;

  constructor(private readonly logger: AppLogger) {
    this.client = new MinioClient({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    if (!minioConfig.enabled) {
      this.logger.log(
        'MinIO disabled (USE_MINIO=false), skipping connection',
        'MinioService',
      );
      return;
    }
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" created`, 'MinioService');
      } else {
        this.logger.log(`Bucket "${this.bucketName}" ready`, 'MinioService');
      }
    } catch (error: unknown) {
      this.logger.error(
        'Failed to initialize MinIO bucket:',
        'MinioService',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to connect to MinIO storage',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<BaseResponse<UploadedFileResult>> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > minioConfig.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `File exceeds maximum allowed size of ${minioConfig.maxFileSizeBytes} bytes`,
      );
    }

    const objectKey = this.buildObjectKey(file.originalname, folder);

    try {
      const result = await this.client.putObject(
        this.bucketName,
        objectKey,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      return {
        success: true,
        data: {
          objectKey,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          etag: result.etag,
        },
        message: 'File uploaded successfully',
      };
    } catch (error: unknown) {
      this.logger.error('Error uploading file:', 'MinioService', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async updateFile(
    objectKey: string,
    file: Express.Multer.File,
  ): Promise<BaseResponse<UploadedFileResult>> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > minioConfig.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `File exceeds maximum allowed size of ${minioConfig.maxFileSizeBytes} bytes`,
      );
    }

    await this.ensureObjectExists(objectKey);

    try {
      const result = await this.client.putObject(
        this.bucketName,
        objectKey,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      return {
        success: true,
        data: {
          objectKey,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          etag: result.etag,
        },
        message: 'File updated successfully',
      };
    } catch (error: unknown) {
      this.logger.error('Error updating file:', 'MinioService', error);
      throw new InternalServerErrorException('Failed to update file');
    }
  }

  async deleteFile(
    objectKey: string,
  ): Promise<BaseResponse<{ objectKey: string }>> {
    await this.ensureObjectExists(objectKey);

    try {
      await this.client.removeObject(this.bucketName, objectKey);

      return {
        success: true,
        data: { objectKey },
        message: 'File deleted successfully',
      };
    } catch (error: unknown) {
      this.logger.error('Error deleting file:', 'MinioService', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getPresignedUrl(
    objectKey: string,
    expirySeconds?: number,
    disposition?: 'inline' | 'attachment',
  ): Promise<BaseResponse<{ url: string; expiresIn: number }>> {
    await this.ensureObjectExists(objectKey);

    const expiresIn =
      expirySeconds ?? minioConfig.defaultPresignedUrlExpirySeconds;
    const fileName = objectKey.split('/').pop() ?? objectKey;

    try {
      const url = await this.client.presignedGetObject(
        this.bucketName,
        objectKey,
        expiresIn,
        {
          'response-content-disposition':
            disposition === 'attachment'
              ? `attachment; filename="${fileName}"`
              : 'inline',
        },
      );

      return {
        success: true,
        data: { url, expiresIn },
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error generating presigned URL:',
        'MinioService',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate presigned URL',
      );
    }
  }

  async streamFile(objectKey: string, res: Response): Promise<void> {
    const stat = await this.ensureObjectExists(objectKey);
    const fileName = objectKey.split('/').pop() ?? objectKey;

    try {
      const objectStream = await this.client.getObject(
        this.bucketName,
        objectKey,
      );

      res.setHeader(
        'Content-Type',
        (stat.metaData['content-type'] as string) || 'application/octet-stream',
      );
      res.setHeader('Content-Length', stat.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );

      objectStream.on('error', (error: unknown) => {
        this.logger.error('Error streaming file:', 'MinioService', error);
        res.destroy(error as Error);
      });

      objectStream.pipe(res);
    } catch (error: unknown) {
      this.logger.error('Error fetching file:', 'MinioService', error);
      throw new InternalServerErrorException('Failed to fetch file');
    }
  }

  async listFiles(
    prefix?: string,
    limit?: number,
    startAfter?: string,
  ): Promise<BaseResponse<ListObjectsResult>> {
    const effectiveLimit = limit ?? 50;

    try {
      const result = await new Promise<ListObjectsResult>((resolve, reject) => {
        const objects: MinioObjectInfo[] = [];
        const stream = this.client.listObjectsV2(
          this.bucketName,
          prefix,
          true,
          startAfter,
        );

        stream.on('data', (item: BucketItem) => {
          if (objects.length >= effectiveLimit + 1) {
            return;
          }

          if (item.name) {
            objects.push({
              objectKey: item.name,
              size: item.size,
              lastModified: item.lastModified,
              etag: item.etag,
            });
          }

          if (objects.length >= effectiveLimit + 1) {
            stream.destroy();
          }
        });

        stream.on('end', () => {
          const hasMore = objects.length > effectiveLimit;
          const page = objects.slice(0, effectiveLimit);
          resolve({
            objects: page,
            nextStartAfter: hasMore
              ? page[page.length - 1]?.objectKey
              : undefined,
            hasMore,
          });
        });

        stream.on('close', () => {
          const hasMore = objects.length > effectiveLimit;
          const page = objects.slice(0, effectiveLimit);
          resolve({
            objects: page,
            nextStartAfter: hasMore
              ? page[page.length - 1]?.objectKey
              : undefined,
            hasMore,
          });
        });

        stream.on('error', (error: unknown) => reject(error));
      });

      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error listing files:', 'MinioService', error);
      throw new InternalServerErrorException('Failed to list files');
    }
  }

  private buildObjectKey(originalName: string, folder?: string): string {
    const sanitized = originalName
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .slice(-150);
    const key = `${uuidv4()}-${sanitized}`;
    return folder ? `${folder}/${key}` : key;
  }

  private async ensureObjectExists(objectKey: string): Promise<BucketItemStat> {
    try {
      return await this.client.statObject(this.bucketName, objectKey);
    } catch (error: unknown) {
      if (
        error instanceof S3Error &&
        (error.code === 'NotFound' || error.code === 'NoSuchKey')
      ) {
        throw new NotFoundException(`File "${objectKey}" not found`);
      }

      this.logger.error(
        'Error checking file existence:',
        'MinioService',
        error,
      );
      throw new InternalServerErrorException('Failed to access file');
    }
  }
}
