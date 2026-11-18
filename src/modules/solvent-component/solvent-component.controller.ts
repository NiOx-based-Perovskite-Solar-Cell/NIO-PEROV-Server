// solvent-component.controller.ts
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
import { SolventComponentService } from './solvent-component.service';
import {
  SearchSolventComponentDto,
  CreateSolventComponentDto,
  UpdateSolventComponentDto,
} from './dto/solvent-component.dto';

@ApiTags('Solvent component')
@ApiBearerAuth('access-token')
@Controller('solvent-component')
export class SolventComponentController {
  constructor(
    private readonly solventComponentService: SolventComponentService,
  ) {}

  /**
   * Search solvent components with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search solvent components with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Solvent components retrieved successfully',
  })
  async search(@Query() dto: SearchSolventComponentDto) {
    const data = await this.solventComponentService.search(dto);
    return data;
  }

  /**
   * Get every component of a solvent system
   */
  @Get('solvent-system/:solvent_system_id')
  @ApiOperation({ summary: 'Get components of a solvent system' })
  @ApiResponse({ status: 200, description: 'Components retrieved' })
  async findBySolventSystemId(
    @Param('solvent_system_id', ParseIntPipe) solventSystemId: number,
  ) {
    const data =
      await this.solventComponentService.findBySolventSystemId(solventSystemId);
    return data;
  }

  /**
   * Create a new solvent component
   */
  @Post()
  @ApiOperation({ summary: 'Create a new solvent component' })
  @ApiResponse({ status: 201, description: 'Component created successfully' })
  @ApiResponse({ status: 409, description: 'Component already exists' })
  async create(@Body() dto: CreateSolventComponentDto) {
    const data = await this.solventComponentService.create(dto);
    return data;
  }

  /**
   * Update the fraction of a solvent component
   */
  @Put(':solvent_system_id/:material_id')
  @ApiOperation({ summary: 'Update component fraction by key' })
  @ApiResponse({ status: 200, description: 'Component updated successfully' })
  @ApiResponse({ status: 404, description: 'Component not found' })
  async update(
    @Param('solvent_system_id', ParseIntPipe) solventSystemId: number,
    @Param('material_id', ParseIntPipe) materialId: number,
    @Body() dto: UpdateSolventComponentDto,
  ) {
    const data = await this.solventComponentService.update(
      { solvent_system_id: solventSystemId, material_id: materialId },
      dto,
    );
    return data;
  }

  /**
   * Delete a solvent component
   */
  @Delete(':solvent_system_id/:material_id')
  @ApiOperation({ summary: 'Delete component by key' })
  @ApiResponse({ status: 200, description: 'Component deleted successfully' })
  @ApiResponse({ status: 404, description: 'Component not found' })
  async delete(
    @Param('solvent_system_id', ParseIntPipe) solventSystemId: number,
    @Param('material_id', ParseIntPipe) materialId: number,
  ) {
    const data = await this.solventComponentService.delete({
      solvent_system_id: solventSystemId,
      material_id: materialId,
    });
    return data;
  }
}
