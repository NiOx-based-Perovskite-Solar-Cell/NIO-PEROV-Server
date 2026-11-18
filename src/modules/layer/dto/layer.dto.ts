// layer.dto.ts
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching layers with filters and pagination
 */
export class SearchLayerDto {
  @ApiPropertyOptional({ description: 'Layer ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  layer_id?: string;

  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({
    description: 'Position in the stack (bottom = 1)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @ApiPropertyOptional({
    description: 'Layer role',
    example: 'psk',
    enum: [
      'anode',
      'htl',
      'htl_treatment',
      'psk',
      'psk_treatment',
      'etl',
      'etl_treatment',
      'cathode',
    ],
  })
  @IsOptional()
  @IsIn([
    'anode',
    'htl',
    'htl_treatment',
    'psk',
    'psk_treatment',
    'etl',
    'etl_treatment',
    'cathode',
  ])
  role?: string;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'layer_id',
    enum: [
      'layer_id',
      'sample_id',
      'position',
      'sub_order',
      'role',
      'material_id',
      'thickness_nm',
      'thickness_min_nm',
      'thickness_max_nm',
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
 * DTO for creating a new layer
 */
export class CreateLayerDto {
  @ApiProperty({ description: 'Sample ID', example: '1' })
  @IsBigIntId()
  sample_id!: string;

  @ApiProperty({
    description: 'Position in the stack (bottom = 1)',
    example: 1,
  })
  @IsInt()
  position!: number;

  @ApiPropertyOptional({
    description: 'Order within the same position',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sub_order?: number;

  @ApiPropertyOptional({
    description: 'Layer role',
    example: 'psk',
    enum: [
      'anode',
      'htl',
      'htl_treatment',
      'psk',
      'psk_treatment',
      'etl',
      'etl_treatment',
      'cathode',
    ],
  })
  @IsOptional()
  @IsIn([
    'anode',
    'htl',
    'htl_treatment',
    'psk',
    'psk_treatment',
    'etl',
    'etl_treatment',
    'cathode',
  ])
  role?: string;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Thickness (nm)', example: 500 })
  @IsOptional()
  @IsInt()
  thickness_nm?: number;

  @ApiPropertyOptional({ description: 'Minimum thickness (nm)', example: 450 })
  @IsOptional()
  @IsInt()
  thickness_min_nm?: number;

  @ApiPropertyOptional({ description: 'Maximum thickness (nm)', example: 550 })
  @IsOptional()
  @IsInt()
  thickness_max_nm?: number;
}

/**
 * DTO for updating an existing layer
 */
export class UpdateLayerDto {
  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({
    description: 'Position in the stack (bottom = 1)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiPropertyOptional({
    description: 'Order within the same position',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sub_order?: number;

  @ApiPropertyOptional({
    description: 'Layer role',
    example: 'psk',
    enum: [
      'anode',
      'htl',
      'htl_treatment',
      'psk',
      'psk_treatment',
      'etl',
      'etl_treatment',
      'cathode',
    ],
  })
  @IsOptional()
  @IsIn([
    'anode',
    'htl',
    'htl_treatment',
    'psk',
    'psk_treatment',
    'etl',
    'etl_treatment',
    'cathode',
  ])
  role?: string | null;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @IsInt()
  material_id?: number | null;

  @ApiPropertyOptional({ description: 'Thickness (nm)', example: 500 })
  @IsOptional()
  @IsInt()
  thickness_nm?: number | null;

  @ApiPropertyOptional({ description: 'Minimum thickness (nm)', example: 450 })
  @IsOptional()
  @IsInt()
  thickness_min_nm?: number | null;

  @ApiPropertyOptional({ description: 'Maximum thickness (nm)', example: 550 })
  @IsOptional()
  @IsInt()
  thickness_max_nm?: number | null;
}
