// solvent-component.dto.ts
import { IsInt, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for searching solvent components with filters and pagination
 */
export class SearchSolventComponentDto {
  @ApiPropertyOptional({ description: 'Solvent system ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  solvent_system_id?: number;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

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
 * DTO for creating a new solvent component
 */
export class CreateSolventComponentDto {
  @ApiProperty({ description: 'Solvent system ID', example: 1 })
  @IsInt()
  solvent_system_id!: number;

  @ApiProperty({ description: 'Material ID (the solvent)', example: 1 })
  @IsInt()
  material_id!: number;

  @ApiProperty({ description: 'Fraction in the system', example: 0.8 })
  @IsNumber()
  fraction!: number;
}

/**
 * DTO for updating an existing solvent component
 */
export class UpdateSolventComponentDto {
  @ApiProperty({ description: 'Fraction in the system', example: 0.8 })
  @IsNumber()
  fraction!: number;
}
