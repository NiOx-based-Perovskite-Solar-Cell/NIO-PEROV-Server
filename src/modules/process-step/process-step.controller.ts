// process-step.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProcessStepService } from './process-step.service';
import {
  SearchProcessStepDto,
  CreateProcessStepDto,
  UpdateProcessStepDto,
} from './dto/process-step.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Process step')
@ApiBearerAuth('access-token')
@Controller('process-step')
export class ProcessStepController {
  constructor(private readonly processStepService: ProcessStepService) {}

  /**
   * Search process steps with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search process steps with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Process steps retrieved successfully',
  })
  async search(@Query() dto: SearchProcessStepDto) {
    const data = await this.processStepService.search(dto);
    return data;
  }

  /**
   * Get process step by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get process step by ID' })
  @ApiResponse({ status: 200, description: 'Process step found' })
  @ApiResponse({ status: 404, description: 'Process step not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.processStepService.findById(id);
    return data;
  }

  /**
   * Create a new process step
   */
  @Post()
  @ApiOperation({ summary: 'Create a new process step' })
  @ApiResponse({
    status: 201,
    description: 'Process step created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Process step already exists' })
  async create(@Body() dto: CreateProcessStepDto) {
    const data = await this.processStepService.create(dto);
    return data;
  }

  /**
   * Update an existing process step
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update process step by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process step updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Process step not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateProcessStepDto,
  ) {
    const data = await this.processStepService.update(id, dto);
    return data;
  }

  /**
   * Delete a process step
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete process step by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process step deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Process step not found' })
  @ApiResponse({ status: 409, description: 'Process step is still referenced' })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.processStepService.delete(id);
    return data;
  }
}
