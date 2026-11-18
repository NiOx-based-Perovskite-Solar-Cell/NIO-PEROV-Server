// raw-data.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { BucketItem } from 'minio';
import * as XLSX from 'xlsx';
import { minioConfig } from '../../../common/config/minio.config';
import { AppLogger } from '../../../common/logger/app-logger.service';

const SPREADSHEET_EXTENSIONS = ['xlsx', 'xls', 'csv'];

const RAW_DATA_BUCKET = 'raw-data';

@Injectable()
export class RawDataService {
  private readonly client: MinioClient;

  constructor(private readonly logger: AppLogger) {
    this.client = new MinioClient({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });
  }

  /**
   * Get all raw data from the "raw-data" MinIO bucket, grouped by paper
   * and split into samples
   */
  async findAll() {
    try {
      const objectKeys = await this.listObjectKeys();
      const items = await Promise.all(
        objectKeys.map((objectKey) => this.readObject(objectKey)),
      );

      const papers = new Map<
        string,
        { paper: string; samples: (typeof items)[number][] }
      >();

      for (const item of items) {
        const group = papers.get(item.paper) ?? {
          paper: item.paper,
          samples: [],
        };
        group.samples.push(item);
        papers.set(item.paper, group);
      }

      return { success: true, data: Array.from(papers.values()) };
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching raw data from MinIO:',
        'RawDataService',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch raw data');
    }
  }

  private listObjectKeys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const keys: string[] = [];
      const stream = this.client.listObjectsV2(RAW_DATA_BUCKET, '', true);

      stream.on('data', (item: BucketItem) => {
        if (item.name) keys.push(item.name);
      });
      stream.on('end', () => resolve(keys));
      stream.on('error', (error: unknown) => reject(error));
    });
  }

  private async readObject(objectKey: string) {
    const objectStream = await this.client.getObject(
      RAW_DATA_BUCKET,
      objectKey,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of objectStream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const { paper, sample } = this.parseObjectKey(objectKey);

    return {
      paper,
      sample,
      objectKey,
      data: this.parseContent(objectKey, buffer),
    };
  }

  /**
   * Object keys look like "<paper>_Sample<n>.<ext>" - split the paper
   * identifier from the sample label so files can be grouped by paper
   */
  private parseObjectKey(objectKey: string): {
    paper: string;
    sample: string;
  } {
    const match = objectKey.match(/^(.+?)_(Sample[^./]*)\.[^.]+$/i);
    if (match) {
      return { paper: match[1], sample: match[2] };
    }

    const dotIndex = objectKey.lastIndexOf('.');
    const paper = dotIndex > -1 ? objectKey.slice(0, dotIndex) : objectKey;
    return { paper, sample: objectKey };
  }

  private parseContent(objectKey: string, buffer: Buffer): unknown {
    const ext = objectKey.split('.').pop()?.toLowerCase();

    if (ext && SPREADSHEET_EXTENSIONS.includes(ext)) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets: Record<string, unknown[]> = {};

      for (const sheetName of workbook.SheetNames) {
        sheets[sheetName] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
        );
      }

      return sheets;
    }

    const text = buffer.toString('utf-8');
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
