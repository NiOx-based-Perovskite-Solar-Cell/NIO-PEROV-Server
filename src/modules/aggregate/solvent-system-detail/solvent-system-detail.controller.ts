// solvent-system-detail.controller.ts
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
import { SolventSystemDetailService } from './solvent-system-detail.service';
import {
  CreateSolventSystemDetailDto,
  ReplaceComponentsDto,
} from './dto/solvent-system-detail.dto';

@ApiTags('Solvent system detail')
@ApiBearerAuth('access-token')
@Controller('solvent-system-detail')
export class SolventSystemDetailController {
  constructor(
    private readonly solventSystemDetailService: SolventSystemDetailService,
  ) {}

  /**
   * Get solvent system with components
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get solvent system with components by ID' })
  @ApiResponse({ status: 200, description: 'Solvent system found' })
  @ApiResponse({ status: 404, description: 'Solvent system not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.solventSystemDetailService.findById(id);
    return data;
  }

  /**
   * Create a solvent system with its components
   */
  @Post()
  @ApiOperation({
    summary: 'Create solvent system with components in one transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'Solvent system created successfully',
  })
  @ApiResponse({ status: 400, description: 'Fractions do not sum to 1' })
  async create(@Body() dto: CreateSolventSystemDetailDto) {
    const data = await this.solventSystemDetailService.create(dto);
    return data;
  }

  /**
   * Replace all components of a solvent system
   */
  @Put(':id/components')
  @ApiOperation({ summary: 'Replace the components of a solvent system' })
  @ApiResponse({ status: 200, description: 'Components replaced successfully' })
  @ApiResponse({ status: 404, description: 'Solvent system not found' })
  async replaceComponents(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceComponentsDto,
  ) {
    const data = await this.solventSystemDetailService.replaceComponents(
      id,
      dto,
    );
    return data;
  }
}
