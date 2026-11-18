// process-type.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProcessTypeService } from './process-type.service';
import {
  SearchProcessTypeDto,
  CreateProcessTypeDto,
  UpdateProcessTypeDto,
} from './dto/process-type.dto';

@ApiTags('Process type')
@ApiBearerAuth('access-token')
@Controller('process-type')
export class ProcessTypeController {
  constructor(private readonly processTypeService: ProcessTypeService) {}

  /**
   * Search process types with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search process types with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Process types retrieved successfully',
  })
  async search(@Query() dto: SearchProcessTypeDto) {
    const data = await this.processTypeService.search(dto);
    return data;
  }

  /**
   * Get process type by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get process type by ID' })
  @ApiResponse({ status: 200, description: 'Process type found' })
  @ApiResponse({ status: 404, description: 'Process type not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.processTypeService.findById(id);
    return data;
  }

  /**
   * Create a new process type
   */
  @Post()
  @ApiOperation({ summary: 'Create a new process type' })
  @ApiResponse({
    status: 201,
    description: 'Process type created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Process type already exists' })
  async create(@Body() dto: CreateProcessTypeDto) {
    const data = await this.processTypeService.create(dto);
    return data;
  }

  /**
   * Update an existing process type
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update process type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process type updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Process type not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcessTypeDto,
  ) {
    const data = await this.processTypeService.update(id, dto);
    return data;
  }

  /**
   * Delete a process type
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete process type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Process type deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Process type not found' })
  @ApiResponse({ status: 409, description: 'Process type is still referenced' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.processTypeService.delete(id);
    return data;
  }
}
