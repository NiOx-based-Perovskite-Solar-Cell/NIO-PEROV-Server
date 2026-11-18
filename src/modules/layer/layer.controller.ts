// layer.controller.ts
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
import { LayerService } from './layer.service';
import {
  SearchLayerDto,
  CreateLayerDto,
  UpdateLayerDto,
} from './dto/layer.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Layer')
@ApiBearerAuth('access-token')
@Controller('layer')
export class LayerController {
  constructor(private readonly layerService: LayerService) {}

  /**
   * Search layers with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search layers with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Layers retrieved successfully' })
  async search(@Query() dto: SearchLayerDto) {
    const data = await this.layerService.search(dto);
    return data;
  }

  /**
   * Get layer by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get layer by ID' })
  @ApiResponse({ status: 200, description: 'Layer found' })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.layerService.findById(id);
    return data;
  }

  /**
   * Create a new layer
   */
  @Post()
  @ApiOperation({ summary: 'Create a new layer' })
  @ApiResponse({ status: 201, description: 'Layer created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Layer already exists' })
  async create(@Body() dto: CreateLayerDto) {
    const data = await this.layerService.create(dto);
    return data;
  }

  /**
   * Update an existing layer
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update layer by ID' })
  @ApiResponse({ status: 200, description: 'Layer updated successfully' })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateLayerDto,
  ) {
    const data = await this.layerService.update(id, dto);
    return data;
  }

  /**
   * Delete a layer
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete layer by ID' })
  @ApiResponse({ status: 200, description: 'Layer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 409, description: 'Layer is still referenced' })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.layerService.delete(id);
    return data;
  }
}
