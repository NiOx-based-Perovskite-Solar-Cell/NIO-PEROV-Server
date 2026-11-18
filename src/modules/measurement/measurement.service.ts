// measurement.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Measurement } from './entities/measurement.entity';
import {
  SearchMeasurementDto,
  CreateMeasurementDto,
  UpdateMeasurementDto,
} from './dto/measurement.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'measurement_id',
  'sample_id',
  'property_id',
  'statistic',
  'scan',
  'value',
  'error',
  'unit',
];

@Injectable()
export class MeasurementService {
  constructor(
    @InjectRepository(Measurement)
    private measurementRepo: Repository<Measurement>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search measurements with filters and pagination (no filter = get all)
   */
  async search(dto: SearchMeasurementDto) {
    let query = `
      SELECT me.*, pr.code AS property_code, COUNT(*) OVER() as total_count
      FROM measurement me
      LEFT JOIN property pr ON pr.property_id = me.property_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.measurement_id !== undefined) {
      query += ` AND me.measurement_id = $${index++}`;
      values.push(dto.measurement_id);
    }

    if (dto.sample_id !== undefined) {
      query += ` AND me.sample_id = $${index++}`;
      values.push(dto.sample_id);
    }

    if (dto.property_id !== undefined) {
      query += ` AND me.property_id = $${index++}`;
      values.push(dto.property_id);
    }

    if (dto.statistic !== undefined) {
      query += ` AND me.statistic = $${index++}`;
      values.push(dto.statistic);
    }

    if (dto.scan !== undefined) {
      query += ` AND me.scan = $${index++}`;
      values.push(dto.scan);
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY me.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY me.measurement_id ASC`;
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
      const result: Measurement[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching measurements:',
        'MeasurementService',
        error,
      );
      throw new InternalServerErrorException('Error fetching measurements');
    }
  }

  /**
   * Get measurement by ID
   */
  async findById(id: string) {
    const measurement = await this.measurementRepo.findOne({
      where: { measurement_id: id },
    });

    if (!measurement) {
      throw new NotFoundException('Measurement not found');
    }

    return { success: true, data: measurement };
  }

  /**
   * Create a new measurement
   */
  async create(dto: CreateMeasurementDto) {
    if (dto.sample_id === undefined || dto.property_id === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newMeasurement = this.measurementRepo.create({
        sample_id: dto.sample_id,
        property_id: dto.property_id,
        statistic: dto.statistic ?? null,
        scan: dto.scan,
        value: dto.value ?? null,
        error: dto.error ?? null,
        unit: dto.unit ?? null,
      });

      const savedMeasurement = await this.measurementRepo.save(newMeasurement);

      this.logger.debug('Measurement created', 'MeasurementService', {
        measurement_id: savedMeasurement.measurement_id,
      });

      return {
        success: true,
        data: savedMeasurement,
        message: 'Measurement created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Measurement', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating measurement:',
        'MeasurementService',
        error,
      );
      throw new InternalServerErrorException('Error creating measurement');
    }
  }

  /**
   * Update an existing measurement
   */
  async update(id: string, dto: UpdateMeasurementDto) {
    // Check if measurement exists
    const existingMeasurement = await this.measurementRepo.findOne({
      where: { measurement_id: id },
    });

    if (!existingMeasurement) {
      throw new NotFoundException('Measurement not found');
    }

    // Build update object dynamically
    const updates: Partial<Measurement> = {};

    if (dto.sample_id !== undefined) updates.sample_id = dto.sample_id;
    if (dto.property_id !== undefined) updates.property_id = dto.property_id;
    if (dto.statistic !== undefined) updates.statistic = dto.statistic;
    if (dto.scan !== undefined) updates.scan = dto.scan;
    if (dto.value !== undefined) updates.value = dto.value;
    if (dto.error !== undefined) updates.error = dto.error;
    if (dto.unit !== undefined) updates.unit = dto.unit;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.measurementRepo.update({ measurement_id: id }, updates);

      const updatedMeasurement = await this.measurementRepo.findOne({
        where: { measurement_id: id },
      });

      this.logger.debug('Measurement updated', 'MeasurementService', {
        measurement_id: id,
      });

      return {
        success: true,
        data: updatedMeasurement,
        message: 'Measurement updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Measurement', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating measurement:',
        'MeasurementService',
        error,
      );
      throw new InternalServerErrorException('Error updating measurement');
    }
  }

  /**
   * Delete a measurement by ID
   */
  async delete(id: string) {
    // Check if measurement exists
    const existingMeasurement = await this.measurementRepo.findOne({
      where: { measurement_id: id },
    });

    if (!existingMeasurement) {
      throw new NotFoundException('Measurement not found');
    }

    try {
      await this.measurementRepo.delete({ measurement_id: id });

      this.logger.debug('Measurement deleted', 'MeasurementService', {
        measurement_id: id,
      });

      return {
        success: true,
        data: existingMeasurement,
        message: 'Measurement deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Measurement', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting measurement:',
        'MeasurementService',
        error,
      );
      throw new InternalServerErrorException('Error deleting measurement');
    }
  }
}
