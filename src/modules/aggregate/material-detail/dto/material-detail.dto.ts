// material-detail.dto.ts
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateMaterialDto } from '../../../material/dto/material.dto';
import { CreatePerovskiteCompositionDto } from '../../../perovskite-composition/dto/perovskite-composition.dto';
import { CreateMaterialSourceDto } from '../../../material-source/dto/material-source.dto';

export class MaterialCompositionDto extends OmitType(
  CreatePerovskiteCompositionDto,
  ['material_id'] as const,
) {}

export class MaterialSourceItemDto extends OmitType(CreateMaterialSourceDto, [
  'material_id',
] as const) {}

/**
 * DTO for creating a material with its composition and sources in one transaction
 */
export class CreateMaterialDetailDto extends CreateMaterialDto {
  @ApiPropertyOptional({ type: [MaterialCompositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialCompositionDto)
  composition?: MaterialCompositionDto[];

  @ApiPropertyOptional({ type: [MaterialSourceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialSourceItemDto)
  sources?: MaterialSourceItemDto[];
}

/**
 * DTO for replacing the whole composition of a material
 */
export class ReplaceCompositionDto {
  @ApiProperty({ type: [MaterialCompositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialCompositionDto)
  composition!: MaterialCompositionDto[];
}
