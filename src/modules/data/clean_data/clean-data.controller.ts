// clean-data.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CleanDataService } from './clean-data.service';
import { RunCleanQueryDto } from './dto/clean-data.dto';
import { PIPELINE_STEPS } from './interface/clean-data.types';
import type { PipelineState, StepName } from './interface/clean-data.types';

const STEP_ENUM = Object.fromEntries(PIPELINE_STEPS.map((s) => [s, s]));

@ApiTags('Clean Data')
@ApiBearerAuth('access-token')
@Controller('clean-data')
export class CleanDataController {
  constructor(private readonly cleanDataService: CleanDataService) {}

  /**
   * List the pipeline steps in run order
   */
  @Get('steps')
  @ApiOperation({ summary: 'List clean pipeline steps' })
  steps() {
    return { success: true, data: PIPELINE_STEPS };
  }

  /**
   * Clean one or more raw .xlsx files (<DOI>_Sample<n>.xlsx)
   */
  @Post('run')
  @UseInterceptors(FilesInterceptor('files', 200))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary: 'Run the clean pipeline on raw xlsx files',
    description:
      'Returns per file: status, clean (gold JSON) and quarantine (errors + raw rows that did not pass)',
  })
  @ApiResponse({ status: 201, description: 'Pipeline finished' })
  @ApiResponse({ status: 400, description: 'No file provided' })
  run(
    @UploadedFiles() files: Express.Multer.File[],
    @Query() query: RunCleanQueryDto,
  ) {
    if (!files?.length)
      throw new BadRequestException('No file provided (field "files")');

    const data = this.cleanDataService.runBatch(
      files.map((f) => ({
        // multer decodes multipart file names as latin1
        fileName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
        buffer: f.buffer,
      })),
      { until: query.until },
    );
    return { success: true, data };
  }

  /**
   * Run a single step on the state JSON returned by the previous step
   */
  @Post('steps/:step')
  @ApiParam({ name: 'step', enum: PIPELINE_STEPS.slice(1) })
  @ApiBody({
    description: 'PipelineState returned by the previous step',
    schema: { type: 'object' },
  })
  @ApiOperation({ summary: 'Run one clean step on the previous step output' })
  @ApiResponse({ status: 201, description: 'Step finished' })
  @ApiResponse({
    status: 400,
    description: 'Body is not the previous step state',
  })
  runStep(
    @Param('step', new ParseEnumPipe(STEP_ENUM)) step: StepName,
    @Body() state: PipelineState<unknown>,
  ) {
    const data = this.cleanDataService.runStep(step, state);
    return { success: true, data };
  }
}
