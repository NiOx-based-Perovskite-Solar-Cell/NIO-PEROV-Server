// measurement.dto.ts
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching measurements with filters and pagination
 */
export class SearchMeasurementDto {
  @ApiPropertyOptional({ description: 'Measurement ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  measurement_id?: string;

  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({ description: 'Property ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  property_id?: number;

  @ApiPropertyOptional({
    description: 'Statistic',
    example: 'champion',
    enum: ['champion', 'average', 'single'],
  })
  @IsOptional()
  @IsIn(['champion', 'average', 'single'])
  statistic?: string;

  @ApiPropertyOptional({
    description: 'Scan direction',
    example: 'RS',
    enum: ['RS', 'FS', 'NA'],
  })
  @IsOptional()
  @IsIn(['RS', 'FS', 'NA'])
  scan?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'measurement_id',
    enum: [
      'measurement_id',
      'sample_id',
      'property_id',
      'statistic',
      'scan',
      'value',
      'error',
      'unit',
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
 * DTO for creating a new measurement
 */
export class CreateMeasurementDto {
  @ApiProperty({ description: 'Sample ID', example: '1' })
  @IsBigIntId()
  sample_id!: string;

  @ApiProperty({ description: 'Property ID', example: 1 })
  @IsInt()
  property_id!: number;

  @ApiPropertyOptional({
    description: 'Statistic',
    example: 'champion',
    enum: ['champion', 'average', 'single'],
  })
  @IsOptional()
  @IsIn(['champion', 'average', 'single'])
  statistic?: string;

  @ApiPropertyOptional({
    description: 'Scan direction',
    example: 'RS',
    enum: ['RS', 'FS', 'NA'],
  })
  @IsOptional()
  @IsIn(['RS', 'FS', 'NA'])
  scan?: string;

  @ApiPropertyOptional({ description: 'Value', example: 25.1 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Error', example: 0.3 })
  @IsOptional()
  @IsNumber()
  error?: number;

  @ApiPropertyOptional({ description: 'Unit code', example: '%' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;
}

/**
 * DTO for updating an existing measurement
 */
export class UpdateMeasurementDto {
  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({ description: 'Property ID', example: 1 })
  @IsOptional()
  @IsInt()
  property_id?: number;

  @ApiPropertyOptional({
    description: 'Statistic',
    example: 'champion',
    enum: ['champion', 'average', 'single'],
  })
  @IsOptional()
  @IsIn(['champion', 'average', 'single'])
  statistic?: string | null;

  @ApiPropertyOptional({
    description: 'Scan direction',
    example: 'RS',
    enum: ['RS', 'FS', 'NA'],
  })
  @IsOptional()
  @IsIn(['RS', 'FS', 'NA'])
  scan?: string;

  @ApiPropertyOptional({ description: 'Value', example: 25.1 })
  @IsOptional()
  @IsNumber()
  value?: number | null;

  @ApiPropertyOptional({ description: 'Error', example: 0.3 })
  @IsOptional()
  @IsNumber()
  error?: number | null;

  @ApiPropertyOptional({ description: 'Unit code', example: '%' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;
}
