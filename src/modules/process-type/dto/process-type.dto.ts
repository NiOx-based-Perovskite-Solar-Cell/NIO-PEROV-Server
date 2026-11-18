// process-type.dto.ts
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for searching process types with filters and pagination
 */
export class SearchProcessTypeDto {
  @ApiPropertyOptional({ description: 'Process type ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  process_type_id?: number;

  @ApiPropertyOptional({
    description: 'Process type code',
    example: 'SPIN_COAT',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'deposition' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for code, category',
    example: 'SPIN_COAT',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'process_type_id',
    enum: ['process_type_id', 'code', 'category'],
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
 * DTO for creating a new process type
 */
export class CreateProcessTypeDto {
  @ApiProperty({ description: 'Process type code', example: 'SPIN_COAT' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ description: 'Category', example: 'deposition' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Expected params and their units',
    example: { speed: 'rpm', time: 's' },
  })
  @IsOptional()
  @IsObject()
  param_template?: Record<string, any>;
}

/**
 * DTO for updating an existing process type
 */
export class UpdateProcessTypeDto {
  @ApiPropertyOptional({
    description: 'Process type code',
    example: 'SPIN_COAT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'deposition' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiPropertyOptional({
    description: 'Expected params and their units',
    example: { speed: 'rpm', time: 's' },
  })
  @IsOptional()
  @IsObject()
  param_template?: Record<string, any>;
}
