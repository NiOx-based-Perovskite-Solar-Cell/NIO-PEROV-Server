// process-param.dto.ts
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
 * DTO for searching process params with filters and pagination
 */
export class SearchProcessParamDto {
  @ApiPropertyOptional({ description: 'Process param ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  param_id?: string;

  @ApiPropertyOptional({ description: 'Process step ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  step_id?: string;

  @ApiPropertyOptional({ description: 'Param name', example: 'speed' })
  @IsOptional()
  @IsString()
  param?: string;

  @ApiPropertyOptional({
    description: 'Qualifier',
    example: '=',
    enum: ['=', '<', '>', '≈'],
  })
  @IsOptional()
  @IsIn(['=', '<', '>', '≈'])
  qualifier?: string;

  @ApiPropertyOptional({ description: 'Unit code', example: 'rpm' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for param',
    example: 'speed',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'param_id',
    enum: [
      'param_id',
      'step_id',
      'param',
      'value',
      'value_min',
      'value_max',
      'qualifier',
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
 * DTO for creating a new process param
 */
export class CreateProcessParamDto {
  @ApiProperty({ description: 'Process step ID', example: '1' })
  @IsBigIntId()
  step_id!: string;

  @ApiProperty({ description: 'Param name', example: 'speed' })
  @IsString()
  @MaxLength(100)
  param!: string;

  @ApiPropertyOptional({ description: 'Value', example: 4000 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Minimum value', example: 3000 })
  @IsOptional()
  @IsNumber()
  value_min?: number;

  @ApiPropertyOptional({ description: 'Maximum value', example: 5000 })
  @IsOptional()
  @IsNumber()
  value_max?: number;

  @ApiPropertyOptional({
    description: 'Qualifier',
    example: '=',
    enum: ['=', '<', '>', '≈'],
  })
  @IsOptional()
  @IsIn(['=', '<', '>', '≈'])
  qualifier?: string;

  @ApiPropertyOptional({ description: 'Unit code', example: 'rpm' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;
}

/**
 * DTO for updating an existing process param
 */
export class UpdateProcessParamDto {
  @ApiPropertyOptional({ description: 'Process step ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  step_id?: string;

  @ApiPropertyOptional({ description: 'Param name', example: 'speed' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  param?: string;

  @ApiPropertyOptional({ description: 'Value', example: 4000 })
  @IsOptional()
  @IsNumber()
  value?: number | null;

  @ApiPropertyOptional({ description: 'Minimum value', example: 3000 })
  @IsOptional()
  @IsNumber()
  value_min?: number | null;

  @ApiPropertyOptional({ description: 'Maximum value', example: 5000 })
  @IsOptional()
  @IsNumber()
  value_max?: number | null;

  @ApiPropertyOptional({
    description: 'Qualifier',
    example: '=',
    enum: ['=', '<', '>', '≈'],
  })
  @IsOptional()
  @IsIn(['=', '<', '>', '≈'])
  qualifier?: string;

  @ApiPropertyOptional({ description: 'Unit code', example: 'rpm' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;
}
