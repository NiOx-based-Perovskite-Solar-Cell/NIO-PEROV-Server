import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({
    description:
      'Optional virtual folder / key prefix to namespace the upload (letters, numbers, - _ / only)',
    example: 'avatars',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-/]+$/, {
    message: 'folder may only contain letters, numbers, "-", "_", and "/"',
  })
  folder?: string;
}

export class ObjectKeyQueryDto {
  @ApiProperty({
    description: 'MinIO object key returned by the upload endpoint',
    example: 'avatars/1b2c3d4e-5f6a-report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;
}

export class PresignedUrlQueryDto extends ObjectKeyQueryDto {
  @ApiPropertyOptional({
    description: 'Expiry in seconds for the presigned URL',
    example: 3600,
    minimum: 60,
    maximum: 604800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(604800)
  expirySeconds?: number;

  @ApiPropertyOptional({
    description:
      'How the browser should treat the file when opened via the URL',
    enum: ['inline', 'attachment'],
    example: 'inline',
  })
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({
    description: 'Prefix / virtual folder to filter objects by',
    example: 'avatars/',
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Max number of objects to return',
    example: 50,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Object key to resume listing after (pagination cursor)',
    example: 'avatars/abc-file.png',
  })
  @IsOptional()
  @IsString()
  startAfter?: string;
}
