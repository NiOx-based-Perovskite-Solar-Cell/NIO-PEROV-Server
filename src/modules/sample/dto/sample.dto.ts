// sample.dto.ts
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching samples with filters and pagination
 */
export class SearchSampleDto {
  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({ description: 'Paper ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  paper_id?: string;

  @ApiPropertyOptional({
    description: 'Sample number within the paper',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sample_no?: number;

  @ApiPropertyOptional({
    description: 'Device architecture',
    example: 'nip',
    enum: ['nip', 'pin'],
  })
  @IsOptional()
  @IsIn(['nip', 'pin'])
  architecture?: string;

  @ApiPropertyOptional({ description: 'Is a control sample', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_control?: boolean;

  @ApiPropertyOptional({ description: 'Submission ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  submission_id?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for label',
    example: 'Control device',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'sample_id',
    enum: [
      'sample_id',
      'paper_id',
      'sample_no',
      'label',
      'architecture',
      'is_control',
      'submission_id',
      'created_at',
      'updated_at',
    ],
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sort_order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Limit', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;
}

/**
 * DTO for creating a new sample
 */
export class CreateSampleDto {
  @ApiProperty({ description: 'Paper ID', example: '1' })
  @IsBigIntId()
  paper_id!: string;

  @ApiPropertyOptional({
    description: 'Sample number within the paper',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  sample_no?: number;

  @ApiPropertyOptional({ description: 'Label', example: 'Control device' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({
    description: 'Device architecture',
    example: 'nip',
    enum: ['nip', 'pin'],
  })
  @IsOptional()
  @IsIn(['nip', 'pin'])
  architecture?: string;

  @ApiPropertyOptional({ description: 'Is a control sample', example: false })
  @IsOptional()
  @IsBoolean()
  is_control?: boolean;

  @ApiPropertyOptional({ description: 'Submission ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  submission_id?: string;
}

/**
 * DTO for updating an existing sample
 */
export class UpdateSampleDto {
  @ApiPropertyOptional({ description: 'Paper ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  paper_id?: string;

  @ApiPropertyOptional({
    description: 'Sample number within the paper',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  sample_no?: number | null;

  @ApiPropertyOptional({ description: 'Label', example: 'Control device' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string | null;

  @ApiPropertyOptional({
    description: 'Device architecture',
    example: 'nip',
    enum: ['nip', 'pin'],
  })
  @IsOptional()
  @IsIn(['nip', 'pin'])
  architecture?: string | null;

  @ApiPropertyOptional({ description: 'Is a control sample', example: false })
  @IsOptional()
  @IsBoolean()
  is_control?: boolean;

  @ApiPropertyOptional({ description: 'Submission ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  submission_id?: string | null;
}
