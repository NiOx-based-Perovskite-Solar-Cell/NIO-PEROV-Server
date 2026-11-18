// process-param.controller.ts
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
import { ProcessParamService } from './process-param.service';
import {
  SearchProcessParamDto,
  CreateProcessParamDto,
  UpdateProcessParamDto,
} from './dto/process-param.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Process param')
@ApiBearerAuth('access-token')
@Controller('process-param')
export class ProcessParamController {
  constructor(private readonly processParamService: ProcessParamService) {}

  /**
   * Search process params with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search process params with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Process params retrieved successfully',
  })
  async search(@Query() dto: SearchProcessParamDto) {
    const data = await this.processParamService.search(dto);
    return data;
  }

  /**
   * Get process param by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get process param by ID' })
  @ApiResponse({ status: 200, description: 'Process param found' })
  @ApiResponse({ status: 404, description: 'Process param not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.processParamService.findById(id);
    return data;
  }

  /**
   * Create a new process param
   */
  @Post()
  @ApiOperation({ summary: 'Create a new process param' })
  @ApiResponse({
    status: 201,
    description: 'Process param created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Process param already exists' })
  async create(@Body() dto: CreateProcessParamDto) {
    const data = await this.processParamService.create(dto);
    return data;
  }

  /**
   * Update an existing process param
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update process param by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process param updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Process param not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateProcessParamDto,
  ) {
    const data = await this.processParamService.update(id, dto);
    return data;
  }

  /**
   * Delete a process param
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete process param by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process param deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Process param not found' })
  @ApiResponse({
    status: 409,
    description: 'Process param is still referenced',
  })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.processParamService.delete(id);
    return data;
  }
}
