// paper-detail.controller.ts
import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getRequestUserId } from '../../../common/utils/auth.utils';
import { SavePaperEntryDto } from './dto/paper-detail.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaperDetailService } from './paper-detail.service';
import { ParseBigIntPipe } from '../../../common/pipes/parse-bigint.pipe';

@ApiTags('Paper detail')
@ApiBearerAuth('access-token')
@Controller('paper-detail')
export class PaperDetailController {
  constructor(private readonly paperDetailService: PaperDetailService) {}

  /**
   * Get paper with creator and all its devices
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get paper detail (creator + device summaries) by ID',
  })
  @ApiResponse({ status: 200, description: 'Paper found' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async findById(@Param('id', ParseBigIntPipe) id: string) {
    const data = await this.paperDetailService.findById(id);
    return data;
  }

  /**
   * Create a paper with its samples (one transaction)
   */
  @Post()
  @ApiOperation({ summary: 'Create a paper with its samples' })
  @ApiResponse({ status: 201, description: 'Paper created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Paper with this DOI already exists',
  })
  async create(@Body() dto: SavePaperEntryDto, @Req() req: Request) {
    const data = await this.paperDetailService.create(
      dto,
      getRequestUserId(req),
    );
    return data;
  }

  /**
   * Update a paper and its samples (one transaction)
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a paper and its samples' })
  @ApiResponse({ status: 200, description: 'Paper updated successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  @ApiResponse({
    status: 409,
    description: 'Paper with this DOI already exists',
  })
  async update(
    @Param('id', ParseBigIntPipe) id: string,
    @Body() dto: SavePaperEntryDto,
  ) {
    const data = await this.paperDetailService.update(id, dto);
    return data;
  }
}
