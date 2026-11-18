// paper.dto.ts
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching papers with filters and pagination
 */
export class SearchPaperDto {
  @ApiPropertyOptional({ description: 'Paper ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  paper_id?: string;

  @ApiPropertyOptional({
    description: 'DOI',
    example: '10.1038/s41586-021-03406-5',
  })
  @IsOptional()
  @IsString()
  doi?: string;

  @ApiPropertyOptional({ description: 'Journal', example: 'Nature' })
  @IsOptional()
  @IsString()
  journal?: string;

  @ApiPropertyOptional({ description: 'Publication year', example: 2021 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: 'Creator user_sys_id', example: '1' })
  @IsOptional()
  @IsBigIntId()
  created_by?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for doi, journal, title and material name',
    example: '10.1038/s41586-021-03406-5',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description:
      'Data source: excel = imported from Excel files, manual = entered in the UI',
    enum: ['excel', 'manual'],
  })
  @IsOptional()
  @IsIn(['excel', 'manual'])
  source_type?: 'excel' | 'manual';

  @ApiPropertyOptional({
    description: 'Workflow status',
    enum: ['draft', 'review', 'published'],
  })
  @IsOptional()
  @IsIn(['draft', 'review', 'published'])
  status?: 'draft' | 'review' | 'published';

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'paper_id',
    enum: [
      'paper_id',
      'doi',
      'journal',
      'year',
      'title',
      'created_by',
      'created_at',
      'updated_at',
      'sample_count',
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
 * DTO for creating a new paper
 */
export class CreatePaperDto {
  @ApiPropertyOptional({
    description: 'DOI',
    example: '10.1038/s41586-021-03406-5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  doi?: string;

  @ApiPropertyOptional({ description: 'Journal', example: 'Nature' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string;

  @ApiPropertyOptional({ description: 'Publication year', example: 2021 })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Title',
    example: 'Efficient perovskite solar cells via ...',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Data sources', example: ['manual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  source?: string[];

  @ApiPropertyOptional({ description: 'Creator user_sys_id', example: '1' })
  @IsOptional()
  @IsBigIntId()
  created_by?: string;
}

/**
 * DTO for updating an existing paper
 */
export class UpdatePaperDto {
  @ApiPropertyOptional({
    description: 'DOI',
    example: '10.1038/s41586-021-03406-5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  doi?: string | null;

  @ApiPropertyOptional({ description: 'Journal', example: 'Nature' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string | null;

  @ApiPropertyOptional({ description: 'Publication year', example: 2021 })
  @IsOptional()
  @IsInt()
  year?: number | null;

  @ApiPropertyOptional({
    description: 'Title',
    example: 'Efficient perovskite solar cells via ...',
  })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ description: 'Data sources', example: ['manual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  source?: string[];

  @ApiPropertyOptional({ description: 'Creator user_sys_id', example: '1' })
  @IsOptional()
  @IsBigIntId()
  created_by?: string | null;
}
