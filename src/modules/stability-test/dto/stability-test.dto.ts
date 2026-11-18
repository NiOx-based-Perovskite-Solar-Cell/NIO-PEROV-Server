// stability-test.dto.ts
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBigIntId } from '../../../common/decorators/bigint-id.decorator';

/**
 * DTO for searching stability tests with filters and pagination
 */
export class SearchStabilityTestDto {
  @ApiPropertyOptional({ description: 'Stability test ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  test_id?: string;

  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({ description: 'Atmosphere', example: 'N2' })
  @IsOptional()
  @IsString()
  atmosphere?: string;

  @ApiPropertyOptional({
    description: 'ISOS protocol code',
    example: 'ISOS-L-1',
  })
  @IsOptional()
  @IsString()
  isos_code?: string;

  @ApiPropertyOptional({ description: 'Encapsulated', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  encapsulated?: boolean;

  @ApiPropertyOptional({
    description: 'Keyword search for atmosphere, light, mode',
    example: 'N2',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'test_id',
    enum: [
      'test_id',
      'sample_id',
      'atmosphere',
      'light',
      'mode',
      'isos_code',
      'encapsulated',
      'temperature_c',
      'rh_pct',
      'rh_min_pct',
      'rh_max_pct',
      'duration_h',
      'retention_pct',
      't80_h',
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
 * DTO for creating a new stability test
 */
export class CreateStabilityTestDto {
  @ApiProperty({ description: 'Sample ID', example: '1' })
  @IsBigIntId()
  sample_id!: string;

  @ApiPropertyOptional({ description: 'Atmosphere', example: 'N2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  atmosphere?: string;

  @ApiPropertyOptional({ description: 'Light condition', example: '1 sun' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  light?: string;

  @ApiPropertyOptional({ description: 'Mode', example: 'MPP tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mode?: string;

  @ApiPropertyOptional({
    description: 'ISOS protocol code',
    example: 'ISOS-L-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  isos_code?: string;

  @ApiPropertyOptional({ description: 'Encapsulated', example: true })
  @IsOptional()
  @IsBoolean()
  encapsulated?: boolean;

  @ApiPropertyOptional({ description: 'Temperature (°C)', example: 25 })
  @IsOptional()
  @IsNumber()
  temperature_c?: number;

  @ApiPropertyOptional({ description: 'Relative humidity (%)', example: 40 })
  @IsOptional()
  @IsNumber()
  rh_pct?: number;

  @ApiPropertyOptional({
    description: 'Minimum relative humidity (%)',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  rh_min_pct?: number;

  @ApiPropertyOptional({
    description: 'Maximum relative humidity (%)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  rh_max_pct?: number;

  @ApiPropertyOptional({ description: 'Duration (h)', example: 1000 })
  @IsOptional()
  @IsNumber()
  duration_h?: number;

  @ApiPropertyOptional({ description: 'PCE retention (%)', example: 90 })
  @IsOptional()
  @IsNumber()
  retention_pct?: number;

  @ApiPropertyOptional({ description: 'T80 (h)', example: 1200 })
  @IsOptional()
  @IsNumber()
  t80_h?: number;
}

/**
 * DTO for updating an existing stability test
 */
export class UpdateStabilityTestDto {
  @ApiPropertyOptional({ description: 'Sample ID', example: '1' })
  @IsOptional()
  @IsBigIntId()
  sample_id?: string;

  @ApiPropertyOptional({ description: 'Atmosphere', example: 'N2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  atmosphere?: string | null;

  @ApiPropertyOptional({ description: 'Light condition', example: '1 sun' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  light?: string | null;

  @ApiPropertyOptional({ description: 'Mode', example: 'MPP tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mode?: string | null;

  @ApiPropertyOptional({
    description: 'ISOS protocol code',
    example: 'ISOS-L-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  isos_code?: string | null;

  @ApiPropertyOptional({ description: 'Encapsulated', example: true })
  @IsOptional()
  @IsBoolean()
  encapsulated?: boolean | null;

  @ApiPropertyOptional({ description: 'Temperature (°C)', example: 25 })
  @IsOptional()
  @IsNumber()
  temperature_c?: number | null;

  @ApiPropertyOptional({ description: 'Relative humidity (%)', example: 40 })
  @IsOptional()
  @IsNumber()
  rh_pct?: number | null;

  @ApiPropertyOptional({
    description: 'Minimum relative humidity (%)',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  rh_min_pct?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum relative humidity (%)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  rh_max_pct?: number | null;

  @ApiPropertyOptional({ description: 'Duration (h)', example: 1000 })
  @IsOptional()
  @IsNumber()
  duration_h?: number | null;

  @ApiPropertyOptional({ description: 'PCE retention (%)', example: 90 })
  @IsOptional()
  @IsNumber()
  retention_pct?: number | null;

  @ApiPropertyOptional({ description: 'T80 (h)', example: 1200 })
  @IsOptional()
  @IsNumber()
  t80_h?: number | null;
}
