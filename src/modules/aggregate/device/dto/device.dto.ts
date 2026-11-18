// device.dto.ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBigIntId } from '../../../../common/decorators/bigint-id.decorator';
import { CreatePaperDto } from '../../../paper/dto/paper.dto';
import { CreateSampleDto } from '../../../sample/dto/sample.dto';
import { CreateLayerDto } from '../../../layer/dto/layer.dto';
import { CreateLayerIngredientDto } from '../../../layer-ingredient/dto/layer-ingredient.dto';
import { CreateProcessStepDto } from '../../../process-step/dto/process-step.dto';
import { CreateProcessParamDto } from '../../../process-param/dto/process-param.dto';
import { CreateMeasurementDto } from '../../../measurement/dto/measurement.dto';
import { CreateStabilityTestDto } from '../../../stability-test/dto/stability-test.dto';

export const DEVICE_SORTABLE_COLUMNS = ['sample_id', 'sample_no', 'year'];

/**
 * DTO for searching device summaries (one row per sample)
 */
export class SearchDeviceDto {
  @ApiPropertyOptional({ description: 'Paper ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  paper_id?: string;

  @ApiPropertyOptional({
    description: 'DOI',
    example: '10.1038/s41586-021-03406-5',
  })
  @IsOptional()
  @IsString()
  doi?: string;

  @ApiPropertyOptional({
    description: 'Architecture',
    example: 'nip',
    enum: ['nip', 'pin'],
  })
  @IsOptional()
  @IsIn(['nip', 'pin'])
  architecture?: string;

  @ApiPropertyOptional({ description: 'Is a control sample', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_control?: boolean;

  @ApiPropertyOptional({ description: 'Perovskite material ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perovskite_material_id?: number;

  @ApiPropertyOptional({ description: 'Publication year from', example: 2020 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year_from?: number;

  @ApiPropertyOptional({ description: 'Publication year to', example: 2025 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year_to?: number;

  @ApiPropertyOptional({
    description: 'Keyword search for doi, title, sample label, perovskite name',
    example: 'FAPbI3',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'sample_id',
    enum: DEVICE_SORTABLE_COLUMNS,
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

// ---------------------------------------------------------------------------
// Nested create - same fields as the per-table DTOs, minus the parent FK
// (filled in by the service inside the transaction)
// ---------------------------------------------------------------------------
export class DeviceSampleDto extends OmitType(CreateSampleDto, [
  'paper_id',
] as const) {}

export class DeviceIngredientDto extends OmitType(CreateLayerIngredientDto, [
  'layer_id',
] as const) {}

export class DeviceProcessParamDto extends OmitType(CreateProcessParamDto, [
  'step_id',
] as const) {}

export class DeviceProcessStepDto extends OmitType(CreateProcessStepDto, [
  'layer_id',
] as const) {
  @ApiPropertyOptional({ type: [DeviceProcessParamDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceProcessParamDto)
  params?: DeviceProcessParamDto[];
}

export class DeviceLayerDto extends OmitType(CreateLayerDto, [
  'sample_id',
] as const) {
  @ApiPropertyOptional({ type: [DeviceIngredientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceIngredientDto)
  ingredients?: DeviceIngredientDto[];

  @ApiPropertyOptional({ type: [DeviceProcessStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceProcessStepDto)
  process_steps?: DeviceProcessStepDto[];
}

export class DeviceMeasurementDto extends OmitType(CreateMeasurementDto, [
  'sample_id',
] as const) {}

export class DeviceStabilityTestDto extends OmitType(CreateStabilityTestDto, [
  'sample_id',
] as const) {}

/**
 * DTO for creating a whole device (sample + stack + results) in one transaction
 */
export class CreateDeviceDto {
  @ApiPropertyOptional({
    description: 'Existing paper ID (or send `paper`)',
    example: '1',
  })
  @IsOptional()
  @IsBigIntId()
  paper_id?: string;

  @ApiPropertyOptional({
    type: CreatePaperDto,
    description:
      'New paper; reused if a paper with the same DOI already exists',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePaperDto)
  paper?: CreatePaperDto;

  @ApiProperty({ type: DeviceSampleDto })
  @ValidateNested()
  @Type(() => DeviceSampleDto)
  sample!: DeviceSampleDto;

  @ApiPropertyOptional({ type: [DeviceLayerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceLayerDto)
  layers?: DeviceLayerDto[];

  @ApiPropertyOptional({ type: [DeviceMeasurementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceMeasurementDto)
  measurements?: DeviceMeasurementDto[];

  @ApiPropertyOptional({ type: [DeviceStabilityTestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceStabilityTestDto)
  stability_tests?: DeviceStabilityTestDto[];
}
