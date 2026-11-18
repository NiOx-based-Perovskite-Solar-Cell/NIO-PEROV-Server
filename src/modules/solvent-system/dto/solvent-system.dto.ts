// solvent-system.dto.ts
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for searching solvent systems with filters and pagination
 */
export class SearchSolventSystemDto {
  @ApiPropertyOptional({ description: 'Solvent system ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  solvent_system_id?: number;

  @ApiPropertyOptional({ description: 'Label', example: 'DMF:DMSO 4:1' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Fraction basis',
    example: 'v/v',
    enum: ['v/v', 'w/w'],
  })
  @IsOptional()
  @IsIn(['v/v', 'w/w'])
  basis?: string;

  @ApiPropertyOptional({
    description: 'Keyword search for label',
    example: 'DMF:DMSO 4:1',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'solvent_system_id',
    enum: ['solvent_system_id', 'label', 'basis'],
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
 * DTO for creating a new solvent system
 */
export class CreateSolventSystemDto {
  @ApiPropertyOptional({ description: 'Label', example: 'DMF:DMSO 4:1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({
    description: 'Fraction basis',
    example: 'v/v',
    enum: ['v/v', 'w/w'],
  })
  @IsOptional()
  @IsIn(['v/v', 'w/w'])
  basis?: string;
}

/**
 * DTO for updating an existing solvent system
 */
export class UpdateSolventSystemDto {
  @ApiPropertyOptional({ description: 'Label', example: 'DMF:DMSO 4:1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string | null;

  @ApiPropertyOptional({
    description: 'Fraction basis',
    example: 'v/v',
    enum: ['v/v', 'w/w'],
  })
  @IsOptional()
  @IsIn(['v/v', 'w/w'])
  basis?: string;
}
