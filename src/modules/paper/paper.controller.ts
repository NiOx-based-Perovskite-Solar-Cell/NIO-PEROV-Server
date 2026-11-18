// paper.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaperService } from './paper.service';
import {
  SearchPaperDto,
  CreatePaperDto,
  UpdatePaperDto,
} from './dto/paper.dto';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';
import { getRequestUserId } from '../../common/utils/auth.utils';

@ApiTags('Paper')
@ApiBearerAuth('access-token')
@Controller('paper')
export class PaperController {
  constructor(private readonly paperService: PaperService) {}

  /**
   * Search papers with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search papers with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Papers retrieved successfully' })
  async search(@Query() dto: SearchPaperDto) {
    const data = await this.paperService.search(dto);
    return data;
  }

  /**
   * Totals for the admin list (declared before :id so it is not parsed as an id)
   */
  @Get('summary')
  @ApiOperation({ summary: 'Paper / sample totals and papers per status' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async summary() {
    const data = await this.paperService.summary();
    return data;
  }

  /**
   * Get paper by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get paper by ID' })
  @ApiResponse({ status: 200, description: 'Paper found' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.paperService.findById(id);
    return data;
  }

  /**
   * Create a new paper
   */
  @Post()
  @ApiOperation({ summary: 'Create a new paper' })
  @ApiResponse({ status: 201, description: 'Paper created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Paper already exists' })
  async create(@Body() dto: CreatePaperDto, @Req() req: Request) {
    const data = await this.paperService.create(dto, getRequestUserId(req));
    return data;
  }

  /**
   * Update an existing paper
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update paper by ID' })
  @ApiResponse({ status: 200, description: 'Paper updated successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: UpdatePaperDto,
  ) {
    const data = await this.paperService.update(id, dto);
    return data;
  }

  /**
   * Delete a paper
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete paper by ID' })
  @ApiResponse({ status: 200, description: 'Paper deleted successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  @ApiResponse({ status: 409, description: 'Paper is still referenced' })
  async delete(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.paperService.delete(id);
    return data;
  }
}
