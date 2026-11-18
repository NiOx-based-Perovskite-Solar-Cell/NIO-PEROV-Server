// perovskite-composition.dto.ts
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const PEROVSKITE_SITES = ['A', 'B', 'X'];

/**
 * DTO for searching perovskite compositions with filters and pagination
 */
export class SearchPerovskiteCompositionDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({
    description: 'Site',
    example: 'A',
    enum: PEROVSKITE_SITES,
  })
  @IsOptional()
  @IsIn(PEROVSKITE_SITES)
  site?: string;

  @ApiPropertyOptional({ description: 'Ion', example: 'FA' })
  @IsOptional()
  @IsString()
  ion?: string;

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
 * DTO for creating a new perovskite composition row
 */
export class CreatePerovskiteCompositionDto {
  @ApiProperty({ description: 'Material ID', example: 1 })
  @IsInt()
  material_id!: number;

  @ApiProperty({ description: 'Site', example: 'A', enum: PEROVSKITE_SITES })
  @IsIn(PEROVSKITE_SITES)
  site!: string;

  @ApiProperty({ description: 'Ion', example: 'FA' })
  @IsString()
  @MaxLength(50)
  ion!: string;

  @ApiProperty({ description: 'Fraction on the site', example: 0.85 })
  @IsNumber()
  fraction!: number;
}

/**
 * DTO for updating an existing perovskite composition row
 */
export class UpdatePerovskiteCompositionDto {
  @ApiProperty({ description: 'Fraction on the site', example: 0.85 })
  @IsNumber()
  fraction!: number;
}

/**
 * One ion of a composition (no material_id - used before the material exists)
 */
export class CompositionIonDto {
  @ApiProperty({ description: 'Site', example: 'A', enum: PEROVSKITE_SITES })
  @IsIn(PEROVSKITE_SITES)
  site!: 'A' | 'B' | 'X';

  @ApiProperty({ description: 'Ion', example: 'FA' })
  @IsString()
  @MaxLength(50)
  ion!: string;

  @ApiProperty({ description: 'Fraction on the site', example: 0.85 })
  @IsNumber()
  fraction!: number;
}

/**
 * DTO for resolving a perovskite: parse a formula and/or find the material
 * that already has this exact composition
 */
export class ResolveCompositionDto {
  @ApiPropertyOptional({
    description: 'Formula to parse (used when composition is not sent)',
    example: 'Cs0.05MA0.05FA0.9PbI3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  formula?: string;

  @ApiPropertyOptional({
    type: [CompositionIonDto],
    description: 'Composition typed by hand (takes priority over formula)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompositionIonDto)
  composition?: CompositionIonDto[];
}
