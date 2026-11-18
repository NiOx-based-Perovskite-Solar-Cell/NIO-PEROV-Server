import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PIPELINE_STEPS } from '../interface/clean-data.types';
import type { StepName } from '../interface/clean-data.types';

export class RunCleanQueryDto {
  @ApiPropertyOptional({
    description:
      'Stop after this step and return its JSON state (feed it to POST /clean-data/steps/{next})',
    enum: PIPELINE_STEPS,
    example: 'standardize',
  })
  @IsOptional()
  @IsIn(PIPELINE_STEPS)
  until?: StepName;
}
