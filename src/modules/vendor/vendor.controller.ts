// vendor.controller.ts
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
import { VendorService } from './vendor.service';
import {
  SearchVendorDto,
  CreateVendorDto,
  UpdateVendorDto,
} from './dto/vendor.dto';

@ApiTags('Vendor')
@ApiBearerAuth('access-token')
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Search vendors with filters (no filter = get all)
   */
  @Get()
  @ApiOperation({ summary: 'Search vendors with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  async search(@Query() dto: SearchVendorDto) {
    const data = await this.vendorService.search(dto);
    return data;
  }

  /**
   * Get vendor by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor found' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorService.findById(id);
    return data;
  }

  /**
   * Create a new vendor
   */
  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 409, description: 'Vendor already exists' })
  async create(@Body() dto: CreateVendorDto) {
    const data = await this.vendorService.create(dto);
    return data;
  }

  /**
   * Update an existing vendor
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
  ) {
    const data = await this.vendorService.update(id, dto);
    return data;
  }

  /**
   * Delete a vendor
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'Vendor is still referenced' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorService.delete(id);
    return data;
  }
}
