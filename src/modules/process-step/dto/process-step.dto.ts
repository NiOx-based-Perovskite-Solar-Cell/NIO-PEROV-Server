// process-step.dto.ts
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching process steps with filters and pagination
 */
export class SearchProcessStepDto {
  @ApiPropertyOptional({ description: 'Process step ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  step_id?: string;

  @ApiPropertyOptional({ description: 'Layer ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  layer_id?: string;

  @ApiPropertyOptional({
    description: 'Step order within the layer',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  step_order?: number;

  @ApiPropertyOptional({ description: 'Process type ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  process_type_id?: number;

  @ApiPropertyOptional({
    description: 'Scope',
    example: 'layer',
    enum: ['layer', 'material_synthesis'],
  })
  @IsOptional()
  @IsIn(['layer', 'material_synthesis'])
  scope?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for description',
    example: 'Spin coat at 4000 rpm for 30 s',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'step_id',
    enum: [
      'step_id',
      'layer_id',
      'step_order',
      'process_type_id',
      'scope',
      'description',
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
 * DTO for creating a new process step
 */
export class CreateProcessStepDto {
  @ApiProperty({ description: 'Layer ID', example: '1' })
  @IsBigIntId()
  layer_id!: string;

  @ApiProperty({ description: 'Step order within the layer', example: 1 })
  @IsInt()
  step_order!: number;

  @ApiPropertyOptional({ description: 'Process type ID', example: 1 })
  @IsOptional()
  @IsInt()
  process_type_id?: number;

  @ApiPropertyOptional({
    description: 'Scope',
    example: 'layer',
    enum: ['layer', 'material_synthesis'],
  })
  @IsOptional()
  @IsIn(['layer', 'material_synthesis'])
  scope?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Spin coat at 4000 rpm for 30 s',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating an existing process step
 */
export class UpdateProcessStepDto {
  @ApiPropertyOptional({ description: 'Layer ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  layer_id?: string;

  @ApiPropertyOptional({
    description: 'Step order within the layer',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  step_order?: number;

  @ApiPropertyOptional({ description: 'Process type ID', example: 1 })
  @IsOptional()
  @IsInt()
  process_type_id?: number | null;

  @ApiPropertyOptional({
    description: 'Scope',
    example: 'layer',
    enum: ['layer', 'material_synthesis'],
  })
  @IsOptional()
  @IsIn(['layer', 'material_synthesis'])
  scope?: string | null;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Spin coat at 4000 rpm for 30 s',
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}
