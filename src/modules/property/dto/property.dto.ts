// property.dto.ts
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
 * DTO for searching propertys with filters and pagination
 */
export class SearchPropertyDto {
  @ApiPropertyOptional({ description: 'Property ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  property_id?: number;

  @ApiPropertyOptional({ description: 'Property code', example: 'PCE' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Unit code (FK -> unit)', example: '%' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for code',
    example: 'PCE',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'property_id',
    enum: ['property_id', 'code', 'unit', 'valid_min', 'valid_max'],
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
 * DTO for creating a new property
 */
export class CreatePropertyDto {
  @ApiProperty({ description: 'Property code', example: 'PCE' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ description: 'Unit code (FK -> unit)', example: '%' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({ description: 'Minimum valid value', example: 0 })
  @IsOptional()
  @IsNumber()
  valid_min?: number;

  @ApiPropertyOptional({ description: 'Maximum valid value', example: 35 })
  @IsOptional()
  @IsNumber()
  valid_max?: number;
}

/**
 * DTO for updating an existing property
 */
export class UpdatePropertyDto {
  @ApiPropertyOptional({ description: 'Property code', example: 'PCE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Unit code (FK -> unit)', example: '%' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;

  @ApiPropertyOptional({ description: 'Minimum valid value', example: 0 })
  @IsOptional()
  @IsNumber()
  valid_min?: number | null;

  @ApiPropertyOptional({ description: 'Maximum valid value', example: 35 })
  @IsOptional()
  @IsNumber()
  valid_max?: number | null;
}
