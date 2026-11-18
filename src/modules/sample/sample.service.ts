// sample.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sample } from './entities/sample.entity';
import {
  SearchSampleDto,
  CreateSampleDto,
  UpdateSampleDto,
} from './dto/sample.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'sample_id',
  'paper_id',
  'sample_no',
  'label',
  'architecture',
  'is_control',
  'submission_id',
  'created_at',
  'updated_at',
];

@Injectable()
export class SampleService {
  constructor(
    @InjectRepository(Sample)
    private sampleRepo: Repository<Sample>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search samples with filters and pagination (no filter = get all)
   */
  async search(dto: SearchSampleDto) {
    let query = `
      SELECT s.*, p.doi, COUNT(*) OVER() as total_count
      FROM sample s
      LEFT JOIN paper p ON p.paper_id = s.paper_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.sample_id !== undefined) {
      query += ` AND s.sample_id = $${index++}`;
      values.push(dto.sample_id);
    }

    if (dto.paper_id !== undefined) {
      query += ` AND s.paper_id = $${index++}`;
      values.push(dto.paper_id);
    }

    if (dto.sample_no !== undefined) {
      query += ` AND s.sample_no = $${index++}`;
      values.push(dto.sample_no);
    }

    if (dto.architecture !== undefined) {
      query += ` AND s.architecture = $${index++}`;
      values.push(dto.architecture);
    }

    if (typeof dto.is_control === 'boolean') {
      query += ` AND s.is_control = $${index++}`;
      values.push(dto.is_control);
    }

    if (dto.submission_id !== undefined) {
      query += ` AND s.submission_id = $${index++}`;
      values.push(dto.submission_id);
    }

    if (dto.keyword) {
      query += ` AND (s.label ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY s.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY s.sample_id ASC`;
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
      const result: Sample[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching samples:', 'SampleService', error);
      throw new InternalServerErrorException('Error fetching samples');
    }
  }

  /**
   * Get sample by ID
   */
  async findById(id: string) {
    const sample = await this.sampleRepo.findOne({
      where: { sample_id: id },
    });

    if (!sample) {
      throw new NotFoundException('Sample not found');
    }

    return { success: true, data: sample };
  }

  /**
   * Create a new sample
   */
  async create(dto: CreateSampleDto) {
    if (dto.paper_id === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newSample = this.sampleRepo.create({
        paper_id: dto.paper_id,
        sample_no: dto.sample_no ?? null,
        label: dto.label ?? null,
        architecture: dto.architecture ?? null,
        is_control: dto.is_control,
        submission_id: dto.submission_id ?? null,
      });

      const savedSample = await this.sampleRepo.save(newSample);

      this.logger.debug('Sample created', 'SampleService', {
        sample_id: savedSample.sample_id,
      });

      return {
        success: true,
        data: savedSample,
        message: 'Sample created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Sample', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating sample:', 'SampleService', error);
      throw new InternalServerErrorException('Error creating sample');
    }
  }

  /**
   * Update an existing sample
   */
  async update(id: string, dto: UpdateSampleDto) {
    // Check if sample exists
    const existingSample = await this.sampleRepo.findOne({
      where: { sample_id: id },
    });

    if (!existingSample) {
      throw new NotFoundException('Sample not found');
    }

    // Build update object dynamically
    const updates: Partial<Sample> = {};

    if (dto.paper_id !== undefined) updates.paper_id = dto.paper_id;
    if (dto.sample_no !== undefined) updates.sample_no = dto.sample_no;
    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.architecture !== undefined) updates.architecture = dto.architecture;
    if (dto.is_control !== undefined) updates.is_control = dto.is_control;
    if (dto.submission_id !== undefined)
      updates.submission_id = dto.submission_id;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.sampleRepo.update({ sample_id: id }, updates);

      const updatedSample = await this.sampleRepo.findOne({
        where: { sample_id: id },
      });

      this.logger.debug('Sample updated', 'SampleService', { sample_id: id });

      return {
        success: true,
        data: updatedSample,
        message: 'Sample updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Sample', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating sample:', 'SampleService', error);
      throw new InternalServerErrorException('Error updating sample');
    }
  }

  /**
   * Delete a sample by ID
   */
  async delete(id: string) {
    // Check if sample exists
    const existingSample = await this.sampleRepo.findOne({
      where: { sample_id: id },
    });

    if (!existingSample) {
      throw new NotFoundException('Sample not found');
    }

    try {
      await this.sampleRepo.delete({ sample_id: id });

      this.logger.debug('Sample deleted', 'SampleService', { sample_id: id });

      return {
        success: true,
        data: existingSample,
        message: 'Sample deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Sample', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting sample:', 'SampleService', error);
      throw new InternalServerErrorException('Error deleting sample');
    }
  }
}
