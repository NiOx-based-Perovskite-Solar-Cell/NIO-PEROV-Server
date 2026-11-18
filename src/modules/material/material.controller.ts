// material.controller.ts
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
import { MaterialService } from './material.service';
import {
  SearchMaterialDto,
  CreateMaterialDto,
  UpdateMaterialDto,
} from './dto/material.dto';

@ApiTags('Material')
@ApiBearerAuth('access-token')
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * Search materials with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search materials with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Materials retrieved successfully' })
  async search(@Query() dto: SearchMaterialDto) {
    const data = await this.materialService.search(dto);
    return data;
  }

  /**
   * Get material by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get material by ID' })
  @ApiResponse({ status: 200, description: 'Material found' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialService.findById(id);
    return data;
  }

  /**
   * Create a new material
   */
  @Post()
  @ApiOperation({ summary: 'Create a new material' })
  @ApiResponse({ status: 201, description: 'Material created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Material already exists' })
  async create(@Body() dto: CreateMaterialDto) {
    const data = await this.materialService.create(dto);
    return data;
  }

  /**
   * Update an existing material
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update material by ID' })
  @ApiResponse({ status: 200, description: 'Material updated successfully' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    const data = await this.materialService.update(id, dto);
    return data;
  }

  /**
   * Delete a material
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete material by ID' })
  @ApiResponse({ status: 200, description: 'Material deleted successfully' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  @ApiResponse({ status: 409, description: 'Material is still referenced' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialService.delete(id);
    return data;
  }
}
