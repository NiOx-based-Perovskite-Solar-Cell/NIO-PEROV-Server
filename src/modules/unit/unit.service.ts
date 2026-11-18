// unit.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { SearchUnitDto, CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'unit_code',
  'quantity',
  'to_si_factor',
  'to_si_offset',
];

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepo: Repository<Unit>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search units with filters and pagination (no filter = get all)
   */
  async search(dto: SearchUnitDto) {
    let query = `
      SELECT u.*, COUNT(*) OVER() as total_count
      FROM unit u
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.unit_code !== undefined) {
      query += ` AND u.unit_code = $${index++}`;
      values.push(dto.unit_code);
    }

    if (dto.quantity !== undefined) {
      query += ` AND u.quantity = $${index++}`;
      values.push(dto.quantity);
    }

    if (dto.keyword) {
      query += ` AND (u.quantity ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY u.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY u.unit_code ASC`;
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
      const result: Unit[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching units:', 'UnitService', error);
      throw new InternalServerErrorException('Error fetching units');
    }
  }

  /**
   * Get unit by ID
   */
  async findById(id: string) {
    const unit = await this.unitRepo.findOne({
      where: { unit_code: id },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return { success: true, data: unit };
  }

  /**
   * Create a new unit
   */
  async create(dto: CreateUnitDto) {
    if (dto.unit_code === undefined || dto.quantity === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newUnit = this.unitRepo.create({
        unit_code: dto.unit_code,
        quantity: dto.quantity,
        to_si_factor: dto.to_si_factor,
        to_si_offset: dto.to_si_offset,
      });

      // unit_code is client-supplied -> insert (save() would silently overwrite an existing unit)
      await this.unitRepo.insert(newUnit);

      const savedUnit = await this.unitRepo.findOne({
        where: { unit_code: dto.unit_code },
      });

      this.logger.debug('Unit created', 'UnitService', {
        unit_code: dto.unit_code,
      });

      return {
        success: true,
        data: savedUnit,
        message: 'Unit created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Unit', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating unit:', 'UnitService', error);
      throw new InternalServerErrorException('Error creating unit');
    }
  }

  /**
   * Update an existing unit
   */
  async update(id: string, dto: UpdateUnitDto) {
    // Check if unit exists
    const existingUnit = await this.unitRepo.findOne({
      where: { unit_code: id },
    });

    if (!existingUnit) {
      throw new NotFoundException('Unit not found');
    }

    // Build update object dynamically
    const updates: Partial<Unit> = {};

    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.to_si_factor !== undefined) updates.to_si_factor = dto.to_si_factor;
    if (dto.to_si_offset !== undefined) updates.to_si_offset = dto.to_si_offset;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.unitRepo.update({ unit_code: id }, updates);

      const updatedUnit = await this.unitRepo.findOne({
        where: { unit_code: id },
      });

      this.logger.debug('Unit updated', 'UnitService', { unit_code: id });

      return {
        success: true,
        data: updatedUnit,
        message: 'Unit updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Unit', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating unit:', 'UnitService', error);
      throw new InternalServerErrorException('Error updating unit');
    }
  }

  /**
   * Delete a unit by ID
   */
  async delete(id: string) {
    // Check if unit exists
    const existingUnit = await this.unitRepo.findOne({
      where: { unit_code: id },
    });

    if (!existingUnit) {
      throw new NotFoundException('Unit not found');
    }

    try {
      await this.unitRepo.delete({ unit_code: id });

      this.logger.debug('Unit deleted', 'UnitService', { unit_code: id });

      return {
        success: true,
        data: existingUnit,
        message: 'Unit deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Unit', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting unit:', 'UnitService', error);
      throw new InternalServerErrorException('Error deleting unit');
    }
  }
}
