// vendor.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import {
  SearchVendorDto,
  CreateVendorDto,
  UpdateVendorDto,
} from './dto/vendor.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = ['vendor_id', 'name', 'country'];

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepo: Repository<Vendor>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search vendors with filters and pagination (no filter = get all)
   */
  async search(dto: SearchVendorDto) {
    let query = `
      SELECT v.*, COUNT(*) OVER() as total_count
      FROM vendor v
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.vendor_id !== undefined) {
      query += ` AND v.vendor_id = $${index++}`;
      values.push(dto.vendor_id);
    }

    if (dto.name !== undefined) {
      query += ` AND v.name = $${index++}`;
      values.push(dto.name);
    }

    if (dto.country !== undefined) {
      query += ` AND v.country = $${index++}`;
      values.push(dto.country);
    }

    if (dto.keyword) {
      query += ` AND (v.name ILIKE $${index} OR v.country ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY v.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY v.vendor_id ASC`;
    }

    // Pagination
    if (dto.limit) {
      query += ` LIMIT $${index++}`;
      values.push(dto.limit);
    }

    if (dto.offset) {
      query += ` OFFSET $${index++}`;
      values.push(dto.offset);
    }

    try {
      const result: Vendor[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching vendors:', 'VendorService', error);
      throw new InternalServerErrorException('Error fetching vendors');
    }
  }

  /**
   * Get vendor by ID
   */
  async findById(id: number) {
    const vendor = await this.vendorRepo.findOne({
      where: { vendor_id: id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return { success: true, data: vendor };
  }

  /**
   * Create a new vendor
   */
  async create(dto: CreateVendorDto) {
    if (dto.name === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newVendor = this.vendorRepo.create({
        name: dto.name,
        country: dto.country ?? null,
      });

      const savedVendor = await this.vendorRepo.save(newVendor);

      this.logger.debug('Vendor created', 'VendorService', {
        vendor_id: savedVendor.vendor_id,
      });

      return {
        success: true,
        data: savedVendor,
        message: 'Vendor created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Vendor', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating vendor:', 'VendorService', error);
      throw new InternalServerErrorException('Error creating vendor');
    }
  }

  /**
   * Update an existing vendor
   */
  async update(id: number, dto: UpdateVendorDto) {
    // Check if vendor exists
    const existingVendor = await this.vendorRepo.findOne({
      where: { vendor_id: id },
    });

    if (!existingVendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Build update object dynamically
    const updates: Partial<Vendor> = {};

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.country !== undefined) updates.country = dto.country;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.vendorRepo.update({ vendor_id: id }, updates);

      const updatedVendor = await this.vendorRepo.findOne({
        where: { vendor_id: id },
      });

      this.logger.debug('Vendor updated', 'VendorService', { vendor_id: id });

      return {
        success: true,
        data: updatedVendor,
        message: 'Vendor updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Vendor', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating vendor:', 'VendorService', error);
      throw new InternalServerErrorException('Error updating vendor');
    }
  }

  /**
   * Delete a vendor by ID
   */
  async delete(id: number) {
    // Check if vendor exists
    const existingVendor = await this.vendorRepo.findOne({
      where: { vendor_id: id },
    });

    if (!existingVendor) {
      throw new NotFoundException('Vendor not found');
    }

    try {
      await this.vendorRepo.delete({ vendor_id: id });

      this.logger.debug('Vendor deleted', 'VendorService', { vendor_id: id });

      return {
        success: true,
        data: existingVendor,
        message: 'Vendor deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Vendor', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting vendor:', 'VendorService', error);
      throw new InternalServerErrorException('Error deleting vendor');
    }
  }
}
