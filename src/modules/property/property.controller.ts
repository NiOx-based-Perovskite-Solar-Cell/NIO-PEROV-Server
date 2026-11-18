// property.controller.ts
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
import { PropertyService } from './property.service';
import {
  SearchPropertyDto,
  CreatePropertyDto,
  UpdatePropertyDto,
} from './dto/property.dto';

@ApiTags('Property')
@ApiBearerAuth('access-token')
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  /**
   * Search propertys with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search propertys with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Propertys retrieved successfully' })
  async search(@Query() dto: SearchPropertyDto) {
    const data = await this.propertyService.search(dto);
    return data;
  }

  /**
   * Get property by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiResponse({ status: 200, description: 'Property found' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.propertyService.findById(id);
    return data;
  }

  /**
   * Create a new property
   */
  @Post()
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, description: 'Property created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Property already exists' })
  async create(@Body() dto: CreatePropertyDto) {
    const data = await this.propertyService.create(dto);
    return data;
  }

  /**
   * Update an existing property
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update property by ID' })
  @ApiResponse({ status: 200, description: 'Property updated successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropertyDto,
  ) {
    const data = await this.propertyService.update(id, dto);
    return data;
  }

  /**
   * Delete a property
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete property by ID' })
  @ApiResponse({ status: 200, description: 'Property deleted successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 409, description: 'Property is still referenced' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.propertyService.delete(id);
    return data;
  }
}
