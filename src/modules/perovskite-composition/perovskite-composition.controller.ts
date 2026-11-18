// perovskite-composition.controller.ts
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
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PerovskiteCompositionService } from './perovskite-composition.service';
import {
  SearchPerovskiteCompositionDto,
  CreatePerovskiteCompositionDto,
  UpdatePerovskiteCompositionDto,
  ResolveCompositionDto,
} from './dto/perovskite-composition.dto';

@ApiTags('Perovskite composition')
@ApiBearerAuth('access-token')
@Controller('perovskite-composition')
export class PerovskiteCompositionController {
  constructor(
    private readonly perovskiteCompositionService: PerovskiteCompositionService,
  ) {}

  /**
   * Search perovskite compositions with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search perovskite compositions with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Perovskite compositions retrieved successfully',
  })
  async search(@Query() dto: SearchPerovskiteCompositionDto) {
    const data = await this.perovskiteCompositionService.search(dto);
    return data;
  }

  /**
   * Get every composition row of a material
   */
  @Get('material/:material_id')
  @ApiOperation({ summary: 'Get composition of a material' })
  @ApiResponse({ status: 200, description: 'Composition retrieved' })
  async findByMaterialId(
    @Param('material_id', ParseIntPipe) materialId: number,
  ) {
    const data =
      await this.perovskiteCompositionService.findByMaterialId(materialId);
    return data;
  }

  /**
   * Parse a formula / composition and find the material that already has it
   * (declared before POST / so "resolve" is not read as a body route clash)
   */
  @Post('resolve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Parse a perovskite formula and match an existing material',
  })
  @ApiResponse({ status: 200, description: 'Composition resolved' })
  async resolve(@Body() dto: ResolveCompositionDto) {
    const data = await this.perovskiteCompositionService.resolve(dto);
    return data;
  }

  /**
   * Create a new composition row
   */
  @Post()
  @ApiOperation({ summary: 'Create a new perovskite composition row' })
  @ApiResponse({ status: 201, description: 'Composition created successfully' })
  @ApiResponse({ status: 409, description: 'Composition already exists' })
  async create(@Body() dto: CreatePerovskiteCompositionDto) {
    const data = await this.perovskiteCompositionService.create(dto);
    return data;
  }

  /**
   * Update the fraction of a composition row
   */
  @Put(':material_id/:site/:ion')
  @ApiOperation({ summary: 'Update composition fraction by key' })
  @ApiResponse({ status: 200, description: 'Composition updated successfully' })
  @ApiResponse({ status: 404, description: 'Composition not found' })
  async update(
    @Param('material_id', ParseIntPipe) materialId: number,
    @Param('site') site: string,
    @Param('ion') ion: string,
    @Body() dto: UpdatePerovskiteCompositionDto,
  ) {
    const data = await this.perovskiteCompositionService.update(
      { material_id: materialId, site, ion },
      dto,
    );
    return data;
  }

  /**
   * Delete a composition row
   */
  @Delete(':material_id/:site/:ion')
  @ApiOperation({ summary: 'Delete composition row by key' })
  @ApiResponse({ status: 200, description: 'Composition deleted successfully' })
  @ApiResponse({ status: 404, description: 'Composition not found' })
  async delete(
    @Param('material_id', ParseIntPipe) materialId: number,
    @Param('site') site: string,
    @Param('ion') ion: string,
  ) {
    const data = await this.perovskiteCompositionService.delete({
      material_id: materialId,
      site,
      ion,
    });
    return data;
  }
}
