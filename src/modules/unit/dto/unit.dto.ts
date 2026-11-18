// unit.dto.ts
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
 * DTO for searching units with filters and pagination
 */
export class SearchUnitDto {
  @ApiPropertyOptional({ description: 'Unit code', example: 'mA/cm²' })
  @IsOptional()
  @IsString()
  unit_code?: string;

  @ApiPropertyOptional({
    description: 'Physical quantity',
    example: 'current_density',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for quantity',
    example: 'current_density',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'unit_code',
    enum: ['unit_code', 'quantity', 'to_si_factor', 'to_si_offset'],
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
 * DTO for creating a new unit
 */
export class CreateUnitDto {
  @ApiProperty({ description: 'Unit code', example: 'mA/cm²' })
  @IsString()
  @MaxLength(30)
  unit_code!: string;

  @ApiProperty({ description: 'Physical quantity', example: 'current_density' })
  @IsString()
  @MaxLength(100)
  quantity!: string;

  @ApiPropertyOptional({
    description: 'value_in_si = value * factor + offset',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  to_si_factor?: number;

  @ApiPropertyOptional({
    description: 'value_in_si = value * factor + offset',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  to_si_offset?: number;
}

/**
 * DTO for updating an existing unit
 */
export class UpdateUnitDto {
  @ApiPropertyOptional({
    description: 'Physical quantity',
    example: 'current_density',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  quantity?: string;

  @ApiPropertyOptional({
    description: 'value_in_si = value * factor + offset',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  to_si_factor?: number;

  @ApiPropertyOptional({
    description: 'value_in_si = value * factor + offset',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  to_si_offset?: number;
}
