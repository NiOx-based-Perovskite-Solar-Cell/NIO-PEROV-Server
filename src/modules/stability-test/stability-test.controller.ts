// stability-test.controller.ts
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
import { StabilityTestService } from './stability-test.service';
import {
  SearchStabilityTestDto,
  CreateStabilityTestDto,
  UpdateStabilityTestDto,
} from './dto/stability-test.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Stability test')
@ApiBearerAuth('access-token')
@Controller('stability-test')
export class StabilityTestController {
  constructor(private readonly stabilityTestService: StabilityTestService) {}

  /**
   * Search stability tests with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search stability tests with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Stability tests retrieved successfully',
  })
  async search(@Query() dto: SearchStabilityTestDto) {
    const data = await this.stabilityTestService.search(dto);
    return data;
  }

  /**
   * Get stability test by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get stability test by ID' })
  @ApiResponse({ status: 200, description: 'Stability test found' })
  @ApiResponse({ status: 404, description: 'Stability test not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.stabilityTestService.findById(id);
    return data;
  }

  /**
   * Create a new stability test
   */
  @Post()
  @ApiOperation({ summary: 'Create a new stability test' })
  @ApiResponse({
    status: 201,
    description: 'Stability test created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Stability test already exists' })
  async create(@Body() dto: CreateStabilityTestDto) {
    const data = await this.stabilityTestService.create(dto);
    return data;
  }

  /**
   * Update an existing stability test
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update stability test by ID' })
  @ApiResponse({
    status: 200,
    description: 'Stability test updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Stability test not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateStabilityTestDto,
  ) {
    const data = await this.stabilityTestService.update(id, dto);
    return data;
  }

  /**
   * Delete a stability test
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete stability test by ID' })
  @ApiResponse({
    status: 200,
    description: 'Stability test deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Stability test not found' })
  @ApiResponse({
    status: 409,
    description: 'Stability test is still referenced',
  })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.stabilityTestService.delete(id);
    return data;
  }
}
