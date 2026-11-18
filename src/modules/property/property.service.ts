// property.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Property } from './entities/property.entity';
import {
  SearchPropertyDto,
  CreatePropertyDto,
  UpdatePropertyDto,
} from './dto/property.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'property_id',
  'code',
  'unit',
  'valid_min',
  'valid_max',
];

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search propertys with filters and pagination (no filter = get all)
   */
  async search(dto: SearchPropertyDto) {
    let query = `
      SELECT pr.*, COUNT(*) OVER() as total_count
      FROM property pr
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.property_id !== undefined) {
      query += ` AND pr.property_id = $${index++}`;
      values.push(dto.property_id);
    }

    if (dto.code !== undefined) {
      query += ` AND pr.code = $${index++}`;
      values.push(dto.code);
    }

    if (dto.unit !== undefined) {
      query += ` AND pr.unit = $${index++}`;
      values.push(dto.unit);
    }

    if (dto.keyword) {
      query += ` AND (pr.code ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY pr.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY pr.property_id ASC`;
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
      const result: Property[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching propertys:', 'PropertyService', error);
      throw new InternalServerErrorException('Error fetching propertys');
    }
  }

  /**
   * Get property by ID
   */
  async findById(id: number) {
    const property = await this.propertyRepo.findOne({
      where: { property_id: id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return { success: true, data: property };
  }

  /**
   * Create a new property
   */
  async create(dto: CreatePropertyDto) {
    if (dto.code === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newProperty = this.propertyRepo.create({
        code: dto.code,
        unit: dto.unit ?? null,
        valid_min: dto.valid_min ?? null,
        valid_max: dto.valid_max ?? null,
      });

      const savedProperty = await this.propertyRepo.save(newProperty);

      this.logger.debug('Property created', 'PropertyService', {
        property_id: savedProperty.property_id,
      });

      return {
        success: true,
        data: savedProperty,
        message: 'Property created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Property', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating property:', 'PropertyService', error);
      throw new InternalServerErrorException('Error creating property');
    }
  }

  /**
   * Update an existing property
   */
  async update(id: number, dto: UpdatePropertyDto) {
    // Check if property exists
    const existingProperty = await this.propertyRepo.findOne({
      where: { property_id: id },
    });

    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    // Build update object dynamically
    const updates: Partial<Property> = {};

    if (dto.code !== undefined) updates.code = dto.code;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.valid_min !== undefined) updates.valid_min = dto.valid_min;
    if (dto.valid_max !== undefined) updates.valid_max = dto.valid_max;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.propertyRepo.update({ property_id: id }, updates);

      const updatedProperty = await this.propertyRepo.findOne({
        where: { property_id: id },
      });

      this.logger.debug('Property updated', 'PropertyService', {
        property_id: id,
      });

      return {
        success: true,
        data: updatedProperty,
        message: 'Property updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Property', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating property:', 'PropertyService', error);
      throw new InternalServerErrorException('Error updating property');
    }
  }

  /**
   * Delete a property by ID
   */
  async delete(id: number) {
    // Check if property exists
    const existingProperty = await this.propertyRepo.findOne({
      where: { property_id: id },
    });

    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    try {
      await this.propertyRepo.delete({ property_id: id });

      this.logger.debug('Property deleted', 'PropertyService', {
        property_id: id,
      });

      return {
        success: true,
        data: existingProperty,
        message: 'Property deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Property', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting property:', 'PropertyService', error);
      throw new InternalServerErrorException('Error deleting property');
    }
  }
}
