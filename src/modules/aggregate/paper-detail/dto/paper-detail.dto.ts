// paper-detail.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBigIntId } from '../../../../common/decorators/bigint-id.decorator';
import {
  DeviceLayerDto,
  DeviceMeasurementDto,
  DeviceStabilityTestDto,
} from '../../device/dto/device.dto';
import { CompositionIonDto } from '../../../perovskite-composition/dto/perovskite-composition.dto';

export class EntrySolventComponentDto {
  @ApiProperty({ description: 'Solvent material ID', example: 12 })
  @IsInt()
  material_id!: number;

  @ApiProperty({
    description: 'Ratio as reported (normalised to fractions on save)',
    example: 4,
  })
  @IsNumber()
  @IsPositive()
  ratio!: number;
}

export class EntrySolventDto {
  @ApiProperty({ enum: ['v/v', 'w/w'], example: 'v/v' })
  @IsIn(['v/v', 'w/w'])
  basis!: 'v/v' | 'w/w';

  @ApiProperty({ type: [EntrySolventComponentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EntrySolventComponentDto)
  components!: EntrySolventComponentDto[];
}

/**
 * Layer as entered in the admin UI. Either material_id, or (perovskite)
 * material_name + composition -> matched by composition or created on save
 */
export class EntryLayerDto extends DeviceLayerDto {
  @ApiPropertyOptional({
    description:
      'Name of a new perovskite material (when material_id is empty)',
    example: 'Cs0.05MA0.05FA0.9PbI3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  material_name?: string | null;

  @ApiPropertyOptional({
    type: [CompositionIonDto],
    description: 'Perovskite composition (used when material_id is empty)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompositionIonDto)
  composition?: CompositionIonDto[] | null;

  @ApiPropertyOptional({
    type: EntrySolventDto,
    description: 'Solvent of the layer, linked to its ingredients',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EntrySolventDto)
  solvent?: EntrySolventDto | null;
}

export class PaperEntryPaperDto {
  @ApiProperty({ description: 'DOI', example: '10.1002/advs.202309111' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  doi!: string;

  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ description: 'Journal', example: 'Advanced Science' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string | null;

  @ApiPropertyOptional({ description: 'Publication year', example: 2024 })
  @IsOptional()
  @IsInt()
  year?: number | null;
}

export class PaperEntrySampleDto {
  @ApiPropertyOptional({
    description: 'Existing sample to update (omit to create a new sample)',
    example: '1',
  })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({
    description: 'Sample label',
    example: 'Control (NiOx)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string | null;

  @ApiPropertyOptional({ description: 'Is the control device', example: false })
  @IsOptional()
  @IsBoolean()
  is_control?: boolean;

  @ApiPropertyOptional({
    type: [EntryLayerDto],
    description:
      'Device stack. When sent, replaces every layer of the sample (omit to keep the stack)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryLayerDto)
  layers?: EntryLayerDto[];

  @ApiPropertyOptional({
    type: [DeviceMeasurementDto],
    description: 'When sent, replaces every measurement of the sample',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceMeasurementDto)
  measurements?: DeviceMeasurementDto[];

  @ApiPropertyOptional({
    type: [DeviceStabilityTestDto],
    description: 'When sent, replaces every stability test of the sample',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceStabilityTestDto)
  stability_tests?: DeviceStabilityTestDto[];
}

/**
 * Whole paper entry (paper + samples + stack + results) saved in one
 * transaction - sent once from the NIO-PEROV admin "Review & submit" step
 */
export class SavePaperEntryDto {
  @ApiProperty({ type: PaperEntryPaperDto })
  @ValidateNested()
  @Type(() => PaperEntryPaperDto)
  paper!: PaperEntryPaperDto;

  @ApiPropertyOptional({
    description: 'Device architecture, applied to every sample',
    enum: ['nip', 'pin'],
  })
  @IsOptional()
  @IsIn(['nip', 'pin'])
  architecture?: 'nip' | 'pin' | null;

  @ApiProperty({ type: [PaperEntrySampleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperEntrySampleDto)
  samples!: PaperEntrySampleDto[];
}
