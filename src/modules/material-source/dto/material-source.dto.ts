// material-source.dto.ts
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

/**
 * DTO for searching material sources with filters and pagination
 */
export class SearchMaterialSourceDto {
  @ApiPropertyOptional({ description: 'Material source ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  source_id?: number;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Vendor ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendor_id?: number;

  @ApiPropertyOptional({ description: 'Grade', example: 'anhydrous' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for grade',
    example: 'anhydrous',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'source_id',
    enum: ['source_id', 'material_id', 'vendor_id', 'purity_pct', 'grade'],
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
 * DTO for creating a new material source
 */
export class CreateMaterialSourceDto {
  @ApiProperty({ description: 'Material ID', example: 1 })
  @IsInt()
  material_id!: number;

  @ApiPropertyOptional({ description: 'Vendor ID', example: 1 })
  @IsOptional()
  @IsInt()
  vendor_id?: number;

  @ApiPropertyOptional({ description: 'Purity (%)', example: 99.99 })
  @IsOptional()
  @IsNumber()
  purity_pct?: number;

  @ApiPropertyOptional({ description: 'Grade', example: 'anhydrous' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string;
}

/**
 * DTO for updating an existing material source
 */
export class UpdateMaterialSourceDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Vendor ID', example: 1 })
  @IsOptional()
  @IsInt()
  vendor_id?: number | null;

  @ApiPropertyOptional({ description: 'Purity (%)', example: 99.99 })
  @IsOptional()
  @IsNumber()
  purity_pct?: number | null;

  @ApiPropertyOptional({ description: 'Grade', example: 'anhydrous' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string | null;
}
