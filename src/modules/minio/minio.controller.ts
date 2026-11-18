import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { MinioService } from './minio.service';
import { MinioEnabledGuard } from '../../common/guard/minio-enabled.guard';
import {
  ListFilesQueryDto,
  ObjectKeyQueryDto,
  PresignedUrlQueryDto,
  UploadFileDto,
} from './dto/minio.dto';

const fileUploadBodySchema = {
  type: 'object',
  properties: {
    file: { type: 'string', format: 'binary' },
    folder: { type: 'string' },
  },
};

@UseGuards(MinioEnabledGuard)
@ApiTags('Minio')
@Controller('minio')
export class MinioController {
  constructor(private readonly minioService: MinioService) {}

  /**
   * Upload a new file
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileUploadBodySchema })
  @ApiOperation({ summary: 'Upload a new file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'No file provided' })
  @ApiResponse({ status: 413, description: 'File exceeds maximum size' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query() dto: UploadFileDto,
  ) {
    const data = await this.minioService.uploadFile(file, dto.folder);
    return data;
  }

  /**
   * Replace the contents of an existing file
   */
  @Put()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: fileUploadBodySchema })
  @ApiOperation({ summary: 'Replace an existing file by object key' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ObjectKeyQueryDto,
  ) {
    const data = await this.minioService.updateFile(query.key, file);
    return data;
  }

  /**
   * Delete a file by object key
   */
  @Delete()
  @ApiOperation({ summary: 'Delete a file by object key' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(@Query() query: ObjectKeyQueryDto) {
    const data = await this.minioService.deleteFile(query.key);
    return data;
  }

  /**
   * List files, optionally filtered by folder prefix
   */
  @Get()
  @ApiOperation({ summary: 'List files with optional prefix and pagination' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async list(@Query() dto: ListFilesQueryDto) {
    const data = await this.minioService.listFiles(
      dto.prefix,
      dto.limit,
      dto.startAfter,
    );
    return data;
  }

  /**
   * Get a presigned URL to view or download a file
   */
  @Get('url')
  @ApiOperation({ summary: 'Get a presigned URL for a file' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getUrl(@Query() query: PresignedUrlQueryDto) {
    const data = await this.minioService.getPresignedUrl(
      query.key,
      query.expirySeconds,
      query.disposition,
    );
    return data;
  }

  /**
   * Stream a file's bytes directly through the server
   */
  @Get('download')
  @ApiOperation({ summary: 'Download a file streamed through the server' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(
    @Query() query: ObjectKeyQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.minioService.streamFile(query.key, res);
  }
}
