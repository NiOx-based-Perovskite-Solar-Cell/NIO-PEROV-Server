// material-source.controller.ts
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
import { MaterialSourceService } from './material-source.service';
import {
  SearchMaterialSourceDto,
  CreateMaterialSourceDto,
  UpdateMaterialSourceDto,
} from './dto/material-source.dto';

@ApiTags('Material source')
@ApiBearerAuth('access-token')
@Controller('material-source')
export class MaterialSourceController {
  constructor(private readonly materialSourceService: MaterialSourceService) {}

  /**
   * Search material sources with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search material sources with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Material sources retrieved successfully',
  })
  async search(@Query() dto: SearchMaterialSourceDto) {
    const data = await this.materialSourceService.search(dto);
    return data;
  }

  /**
   * Get material source by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get material source by ID' })
  @ApiResponse({ status: 200, description: 'Material source found' })
  @ApiResponse({ status: 404, description: 'Material source not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialSourceService.findById(id);
    return data;
  }

  /**
   * Create a new material source
   */
  @Post()
  @ApiOperation({ summary: 'Create a new material source' })
  @ApiResponse({
    status: 201,
    description: 'Material source created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Material source already exists' })
  async create(@Body() dto: CreateMaterialSourceDto) {
    const data = await this.materialSourceService.create(dto);
    return data;
  }

  /**
   * Update an existing material source
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update material source by ID' })
  @ApiResponse({
    status: 200,
    description: 'Material source updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Material source not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialSourceDto,
  ) {
    const data = await this.materialSourceService.update(id, dto);
    return data;
  }

  /**
   * Delete a material source
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete material source by ID' })
  @ApiResponse({
    status: 200,
    description: 'Material source deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Material source not found' })
  @ApiResponse({
    status: 409,
    description: 'Material source is still referenced',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialSourceService.delete(id);
    return data;
  }
}
