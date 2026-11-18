// layer-ingredient.dto.ts
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
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching layer ingredients with filters and pagination
 */
export class SearchLayerIngredientDto {
  @ApiPropertyOptional({ description: 'Layer ingredient ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  ingredient_id?: string;

  @ApiPropertyOptional({ description: 'Layer ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  layer_id?: string;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Ingredient role', example: 'precursor' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Solvent system ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  solvent_system_id?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'ingredient_id',
    enum: [
      'ingredient_id',
      'layer_id',
      'material_id',
      'role',
      'solvent_system_id',
      'amount',
      'unit',
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
 * DTO for creating a new layer ingredient
 */
export class CreateLayerIngredientDto {
  @ApiProperty({ description: 'Layer ID', example: '1' })
  @IsBigIntId()
  layer_id!: string;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @IsInt()
  material_id?: number;

  @ApiPropertyOptional({ description: 'Ingredient role', example: 'precursor' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({ description: 'Solvent system ID', example: 1 })
  @IsOptional()
  @IsInt()
  solvent_system_id?: number;

  @ApiPropertyOptional({ description: 'Amount', example: 1.2 })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Unit code', example: 'M' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;
}

/**
 * DTO for updating an existing layer ingredient
 */
export class UpdateLayerIngredientDto {
  @ApiPropertyOptional({ description: 'Layer ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  layer_id?: string;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsOptional()
  @IsInt()
  material_id?: number | null;

  @ApiPropertyOptional({ description: 'Ingredient role', example: 'precursor' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string | null;

  @ApiPropertyOptional({ description: 'Solvent system ID', example: 1 })
  @IsOptional()
  @IsInt()
  solvent_system_id?: number | null;

  @ApiPropertyOptional({ description: 'Amount', example: 1.2 })
  @IsOptional()
  @IsNumber()
  amount?: number | null;

  @ApiPropertyOptional({ description: 'Unit code', example: 'M' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;
}
