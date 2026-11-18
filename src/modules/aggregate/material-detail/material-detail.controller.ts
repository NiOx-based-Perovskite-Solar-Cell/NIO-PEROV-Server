// material-detail.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MaterialDetailService } from './material-detail.service';
import {
  CreateMaterialDetailDto,
  ReplaceCompositionDto,
} from './dto/material-detail.dto';

@ApiTags('Material detail')
@ApiBearerAuth('access-token')
@Controller('material-detail')
export class MaterialDetailController {
  constructor(private readonly materialDetailService: MaterialDetailService) {}

  /**
   * Get material with composition, sources and usage
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get material detail (composition, sources, usage) by ID',
  })
  @ApiResponse({ status: 200, description: 'Material found' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialDetailService.findById(id);
    return data;
  }

  /**
   * Create a material with its composition and sources
   */
  @Post()
  @ApiOperation({
    summary: 'Create material with composition and sources in one transaction',
  })
  @ApiResponse({ status: 201, description: 'Material created successfully' })
  @ApiResponse({ status: 409, description: 'Duplicate composition row' })
  async create(@Body() dto: CreateMaterialDetailDto) {
    const data = await this.materialDetailService.create(dto);
    return data;
  }

  /**
   * Replace the whole composition of a material
   */
  @Put(':id/composition')
  @ApiOperation({ summary: 'Replace the composition of a material' })
  @ApiResponse({
    status: 200,
    description: 'Composition replaced successfully',
  })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async replaceComposition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceCompositionDto,
  ) {
    const data = await this.materialDetailService.replaceComposition(id, dto);
    return data;
  }
}
