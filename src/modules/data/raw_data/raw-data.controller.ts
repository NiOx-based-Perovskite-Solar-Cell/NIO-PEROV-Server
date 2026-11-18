// raw-data.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RawDataService } from './raw-data.service';
import { MinioEnabledGuard } from '../../../common/guard/minio-enabled.guard';

@UseGuards(MinioEnabledGuard)
@ApiTags('Raw Data')
@ApiBearerAuth('access-token')
@Controller('raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  /**
   * Get raw data
   */
  @Get()
  @ApiOperation({ summary: 'Get raw data' })
  @ApiResponse({ status: 200, description: 'Raw data retrieved successfully' })
  async findAll() {
    const data = await this.rawDataService.findAll();
    return data;
  }
}
