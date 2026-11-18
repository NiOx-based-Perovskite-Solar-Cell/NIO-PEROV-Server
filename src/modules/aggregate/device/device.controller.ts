// device.controller.ts
import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DeviceService } from './device.service';
import { SearchDeviceDto, CreateDeviceDto } from './dto/device.dto';
import { ParseBigIntPipe } from '../../../common/pipes/parse-bigint.pipe';
import { getRequestUserId } from '../../../common/utils/auth.utils';

@ApiTags('Device')
@ApiBearerAuth('access-token')
@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Device summary list (one row per sample)
   */
  @Get()
  @ApiOperation({
    summary: 'Search device summaries with filters and pagination',
  })
  @ApiResponse({ status: 200, description: 'Devices retrieved successfully' })
  async search(@Query() dto: SearchDeviceDto) {
    const data = await this.deviceService.search(dto);
    return data;
  }

  /**
   * Full device tree of one sample
   */
  @Get(':sample_id')
  @ApiOperation({
    summary: 'Get full device (sample + stack + results) by sample ID',
  })
  @ApiResponse({ status: 200, description: 'Device found' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findById(@Param('sample_id', ParseBigIntPipe) sampleId: string) {
    const data = await this.deviceService.findById(sampleId);
    return data;
  }

  /**
   * Create a whole device in one transaction
   */
  @Post()
  @ApiOperation({
    summary:
      'Create a full device (paper, sample, layers, results) in one transaction',
  })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload or related record not found',
  })
  async create(@Body() dto: CreateDeviceDto, @Req() req: Request) {
    const data = await this.deviceService.create(dto, getRequestUserId(req));
    return data;
  }
}
