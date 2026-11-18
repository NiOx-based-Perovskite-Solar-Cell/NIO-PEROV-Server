// material.dto.ts
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

/**
 * DTO for searching materials with filters and pagination
 */
export class SearchMaterialDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Material name', example: 'PbI2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'precursor' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Physical form', example: 'powder' })
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional({
    description: 'Is a perovskite material',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_perovskite?: boolean;

  @ApiPropertyOptional({
    description: 'Keyword search for name, formula',
    example: 'PbI2',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'material_id',
    enum: [
      'material_id',
      'name',
      'category',
      'form',
      'formula',
      'is_perovskite',
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
 * DTO for creating a new material
 */
export class CreateMaterialDto {
  @ApiProperty({ description: 'Material name', example: 'PbI2' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Category', example: 'precursor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Physical form', example: 'powder' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  form?: string;

  @ApiPropertyOptional({ description: 'Chemical formula', example: 'PbI2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  formula?: string;

  @ApiPropertyOptional({
    description: 'Is a perovskite material',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_perovskite?: boolean;
}

/**
 * DTO for updating an existing material
 */
export class UpdateMaterialDto {
  @ApiPropertyOptional({ description: 'Material name', example: 'PbI2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'precursor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiPropertyOptional({ description: 'Physical form', example: 'powder' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  form?: string | null;

  @ApiPropertyOptional({ description: 'Chemical formula', example: 'PbI2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  formula?: string | null;

  @ApiPropertyOptional({
    description: 'Is a perovskite material',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_perovskite?: boolean;
}
