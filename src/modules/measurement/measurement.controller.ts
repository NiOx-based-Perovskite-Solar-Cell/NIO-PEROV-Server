// measurement.controller.ts
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
import { MeasurementService } from './measurement.service';
import {
  SearchMeasurementDto,
  CreateMeasurementDto,
  UpdateMeasurementDto,
} from './dto/measurement.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Measurement')
@ApiBearerAuth('access-token')
@Controller('measurement')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  /**
   * Search measurements with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search measurements with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Measurements retrieved successfully',
  })
  async search(@Query() dto: SearchMeasurementDto) {
    const data = await this.measurementService.search(dto);
    return data;
  }

  /**
   * Get measurement by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get measurement by ID' })
  @ApiResponse({ status: 200, description: 'Measurement found' })
  @ApiResponse({ status: 404, description: 'Measurement not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.measurementService.findById(id);
    return data;
  }

  /**
   * Create a new measurement
   */
  @Post()
  @ApiOperation({ summary: 'Create a new measurement' })
  @ApiResponse({ status: 201, description: 'Measurement created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Measurement already exists' })
  async create(@Body() dto: CreateMeasurementDto) {
    const data = await this.measurementService.create(dto);
    return data;
  }

  /**
   * Update an existing measurement
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update measurement by ID' })
  @ApiResponse({ status: 200, description: 'Measurement updated successfully' })
  @ApiResponse({ status: 404, description: 'Measurement not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateMeasurementDto,
  ) {
    const data = await this.measurementService.update(id, dto);
    return data;
  }

  /**
   * Delete a measurement
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete measurement by ID' })
  @ApiResponse({ status: 200, description: 'Measurement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Measurement not found' })
  @ApiResponse({ status: 409, description: 'Measurement is still referenced' })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.measurementService.delete(id);
    return data;
  }
}
