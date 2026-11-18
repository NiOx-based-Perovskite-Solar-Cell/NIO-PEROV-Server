// unit.controller.ts
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
import { UnitService } from './unit.service';
import { SearchUnitDto, CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@ApiTags('Unit')
@ApiBearerAuth('access-token')
@Controller('unit')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  /**
   * Search units with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search units with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Units retrieved successfully' })
  async search(@Query() dto: SearchUnitDto) {
    const data = await this.unitService.search(dto);
    return data;
  }

  /**
   * Get unit by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get unit by ID' })
  @ApiResponse({ status: 200, description: 'Unit found' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async findById(@Param('id') id: string) {
    const data = await this.unitService.findById(id);
    return data;
  }

  /**
   * Create a new unit
   */
  @Post()
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiResponse({ status: 201, description: 'Unit created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Unit already exists' })
  async create(@Body() dto: CreateUnitDto) {
    const data = await this.unitService.create(dto);
    return data;
  }

  /**
   * Update an existing unit
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update unit by ID' })
  @ApiResponse({ status: 200, description: 'Unit updated successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    const data = await this.unitService.update(id, dto);
    return data;
  }

  /**
   * Delete a unit
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete unit by ID' })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 409, description: 'Unit is still referenced' })
  async delete(@Param('id') id: string) {
    const data = await this.unitService.delete(id);
    return data;
  }
}
