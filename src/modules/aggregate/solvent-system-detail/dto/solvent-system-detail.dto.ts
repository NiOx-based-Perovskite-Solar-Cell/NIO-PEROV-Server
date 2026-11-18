// solvent-system-detail.dto.ts
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateSolventSystemDto } from '../../../solvent-system/dto/solvent-system.dto';
import { CreateSolventComponentDto } from '../../../solvent-component/dto/solvent-component.dto';

export class SolventComponentItemDto extends OmitType(
  CreateSolventComponentDto,
  ['solvent_system_id'] as const,
) {}

/**
 * DTO for creating a solvent system with its components in one transaction
 */
export class CreateSolventSystemDetailDto extends CreateSolventSystemDto {
  @ApiProperty({ type: [SolventComponentItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SolventComponentItemDto)
  components!: SolventComponentItemDto[];
}

/**
 * DTO for replacing all components of a solvent system
 */
export class ReplaceComponentsDto {
  @ApiProperty({ type: [SolventComponentItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SolventComponentItemDto)
  components!: SolventComponentItemDto[];
}
