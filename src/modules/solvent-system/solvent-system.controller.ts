// solvent-system.controller.ts
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
import { SolventSystemService } from './solvent-system.service';
import {
  SearchSolventSystemDto,
  CreateSolventSystemDto,
  UpdateSolventSystemDto,
} from './dto/solvent-system.dto';

@ApiTags('Solvent system')
@ApiBearerAuth('access-token')
@Controller('solvent-system')
export class SolventSystemController {
  constructor(private readonly solventSystemService: SolventSystemService) {}

  /**
   * Search solvent systems with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({
    summary: 'Search solvent systems with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Solvent systems retrieved successfully',
  })
  async search(@Query() dto: SearchSolventSystemDto) {
    const data = await this.solventSystemService.search(dto);
    return data;
  }

  /**
   * Get solvent system by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get solvent system by ID' })
  @ApiResponse({ status: 200, description: 'Solvent system found' })
  @ApiResponse({ status: 404, description: 'Solvent system not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.solventSystemService.findById(id);
    return data;
  }

  /**
   * Create a new solvent system
   */
  @Post()
  @ApiOperation({ summary: 'Create a new solvent system' })
  @ApiResponse({
    status: 201,
    description: 'Solvent system created successfully',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Solvent system already exists' })
  async create(@Body() dto: CreateSolventSystemDto) {
    const data = await this.solventSystemService.create(dto);
    return data;
  }

  /**
   * Update an existing solvent system
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update solvent system by ID' })
  @ApiResponse({
    status: 200,
    description: 'Solvent system updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Solvent system not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolventSystemDto,
  ) {
    const data = await this.solventSystemService.update(id, dto);
    return data;
  }

  /**
   * Delete a solvent system
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete solvent system by ID' })
  @ApiResponse({
    status: 200,
    description: 'Solvent system deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Solvent system not found' })
  @ApiResponse({
    status: 409,
    description: 'Solvent system is still referenced',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.solventSystemService.delete(id);
    return data;
  }
}
