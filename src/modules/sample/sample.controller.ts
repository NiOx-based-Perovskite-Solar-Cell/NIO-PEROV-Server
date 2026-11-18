// sample.controller.ts
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
import { SampleService } from './sample.service';
import {
  SearchSampleDto,
  CreateSampleDto,
  UpdateSampleDto,
} from './dto/sample.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Sample')
@ApiBearerAuth('access-token')
@Controller('sample')
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  /**
   * Search samples with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search samples with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Samples retrieved successfully' })
  async search(@Query() dto: SearchSampleDto) {
    const data = await this.sampleService.search(dto);
    return data;
  }

  /**
   * Get sample by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get sample by ID' })
  @ApiResponse({ status: 200, description: 'Sample found' })
  @ApiResponse({ status: 404, description: 'Sample not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.sampleService.findById(id);
    return data;
  }

  /**
   * Create a new sample
   */
  @Post()
  @ApiOperation({ summary: 'Create a new sample' })
  @ApiResponse({ status: 201, description: 'Sample created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Sample already exists' })
  async create(@Body() dto: CreateSampleDto) {
    const data = await this.sampleService.create(dto);
    return data;
  }

  /**
   * Update an existing sample
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update sample by ID' })
  @ApiResponse({ status: 200, description: 'Sample updated successfully' })
  @ApiResponse({ status: 404, description: 'Sample not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateSampleDto,
  ) {
    const data = await this.sampleService.update(id, dto);
    return data;
  }

  /**
   * Delete a sample
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete sample by ID' })
  @ApiResponse({ status: 200, description: 'Sample deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sample not found' })
  @ApiResponse({ status: 409, description: 'Sample is still referenced' })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.sampleService.delete(id);
    return data;
  }
}
