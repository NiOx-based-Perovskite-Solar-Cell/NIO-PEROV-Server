// layer-ingredient.controller.ts
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
import { LayerIngredientService } from './layer-ingredient.service';
import {
  SearchLayerIngredientDto,
  CreateLayerIngredientDto,
  UpdateLayerIngredientDto,
} from './dto/layer-ingredient.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@ApiTags('Layer ingredient')
@ApiBearerAuth('access-token')
@Controller('layer-ingredient')
export class LayerIngredientController {
  constructor(
    private readonly layerIngredientService: LayerIngredientService,
  ) {}

  /**
   * Search layer ingredients with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search layer ingredients with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Layer ingredients retrieved successfully',
  })
  async search(@Query() dto: SearchLayerIngredientDto) {
    const data = await this.layerIngredientService.search(dto);
    return data;
  }

  /**
   * Get layer ingredient by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get layer ingredient by ID' })
  @ApiResponse({ status: 200, description: 'Layer ingredient found' })
  @ApiResponse({ status: 404, description: 'Layer ingredient not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.layerIngredientService.findById(id);
    return data;
  }

  /**
   * Create a new layer ingredient
   */
  @Post()
  @ApiOperation({ summary: 'Create a new layer ingredient' })
  @ApiResponse({
    status: 201,
    description: 'Layer ingredient created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Layer ingredient already exists' })
  async create(@Body() dto: CreateLayerIngredientDto) {
    const data = await this.layerIngredientService.create(dto);
    return data;
  }

  /**
   * Update an existing layer ingredient
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update layer ingredient by ID' })
  @ApiResponse({
    status: 200,
    description: 'Layer ingredient updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Layer ingredient not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdateLayerIngredientDto,
  ) {
    const data = await this.layerIngredientService.update(id, dto);
    return data;
  }

  /**
   * Delete a layer ingredient
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete layer ingredient by ID' })
  @ApiResponse({
    status: 200,
    description: 'Layer ingredient deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Layer ingredient not found' })
  @ApiResponse({
    status: 409,
    description: 'Layer ingredient is still referenced',
  })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.layerIngredientService.delete(id);
    return data;
  }
}
