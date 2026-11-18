// process-param.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProcessParam } from './entities/process-param.entity';
import {
  SearchProcessParamDto,
  CreateProcessParamDto,
  UpdateProcessParamDto,
} from './dto/process-param.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'param_id',
  'step_id',
  'param',
  'value',
  'value_min',
  'value_max',
  'qualifier',
  'unit',
];

@Injectable()
export class ProcessParamService {
  constructor(
    @InjectRepository(ProcessParam)
    private processParamRepo: Repository<ProcessParam>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search process params with filters and pagination (no filter = get all)
   */
  async search(dto: SearchProcessParamDto) {
    let query = `
      SELECT pp.*, COUNT(*) OVER() as total_count
      FROM process_param pp
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.param_id !== undefined) {
      query += ` AND pp.param_id = $${index++}`;
      values.push(dto.param_id);
    }

    if (dto.step_id !== undefined) {
      query += ` AND pp.step_id = $${index++}`;
      values.push(dto.step_id);
    }

    if (dto.param !== undefined) {
      query += ` AND pp.param = $${index++}`;
      values.push(dto.param);
    }

    if (dto.qualifier !== undefined) {
      query += ` AND pp.qualifier = $${index++}`;
      values.push(dto.qualifier);
    }

    if (dto.unit !== undefined) {
      query += ` AND pp.unit = $${index++}`;
      values.push(dto.unit);
    }

    if (dto.keyword) {
      query += ` AND (pp.param ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY pp.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY pp.param_id ASC`;
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
      const result: ProcessParam[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching process params:',
        'ProcessParamService',
        error,
      );
      throw new InternalServerErrorException('Error fetching process params');
    }
  }

  /**
   * Get process param by ID
   */
  async findById(id: string) {
    const processParam = await this.processParamRepo.findOne({
      where: { param_id: id },
    });

    if (!processParam) {
      throw new NotFoundException('Process param not found');
    }

    return { success: true, data: processParam };
  }

  /**
   * Create a new process param
   */
  async create(dto: CreateProcessParamDto) {
    if (dto.step_id === undefined || dto.param === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newProcessParam = this.processParamRepo.create({
        step_id: dto.step_id,
        param: dto.param,
        value: dto.value ?? null,
        value_min: dto.value_min ?? null,
        value_max: dto.value_max ?? null,
        qualifier: dto.qualifier,
        unit: dto.unit ?? null,
      });

      const savedProcessParam =
        await this.processParamRepo.save(newProcessParam);

      this.logger.debug('Process param created', 'ProcessParamService', {
        param_id: savedProcessParam.param_id,
      });

      return {
        success: true,
        data: savedProcessParam,
        message: 'Process param created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process param', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating process param:',
        'ProcessParamService',
        error,
      );
      throw new InternalServerErrorException('Error creating process param');
    }
  }

  /**
   * Update an existing process param
   */
  async update(id: string, dto: UpdateProcessParamDto) {
    // Check if process param exists
    const existingProcessParam = await this.processParamRepo.findOne({
      where: { param_id: id },
    });

    if (!existingProcessParam) {
      throw new NotFoundException('Process param not found');
    }

    // Build update object dynamically
    const updates: Partial<ProcessParam> = {};

    if (dto.step_id !== undefined) updates.step_id = dto.step_id;
    if (dto.param !== undefined) updates.param = dto.param;
    if (dto.value !== undefined) updates.value = dto.value;
    if (dto.value_min !== undefined) updates.value_min = dto.value_min;
    if (dto.value_max !== undefined) updates.value_max = dto.value_max;
    if (dto.qualifier !== undefined) updates.qualifier = dto.qualifier;
    if (dto.unit !== undefined) updates.unit = dto.unit;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.processParamRepo.update({ param_id: id }, updates);

      const updatedProcessParam = await this.processParamRepo.findOne({
        where: { param_id: id },
      });

      this.logger.debug('Process param updated', 'ProcessParamService', {
        param_id: id,
      });

      return {
        success: true,
        data: updatedProcessParam,
        message: 'Process param updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process param', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating process param:',
        'ProcessParamService',
        error,
      );
      throw new InternalServerErrorException('Error updating process param');
    }
  }

  /**
   * Delete a process param by ID
   */
  async delete(id: string) {
    // Check if process param exists
    const existingProcessParam = await this.processParamRepo.findOne({
      where: { param_id: id },
    });

    if (!existingProcessParam) {
      throw new NotFoundException('Process param not found');
    }

    try {
      await this.processParamRepo.delete({ param_id: id });

      this.logger.debug('Process param deleted', 'ProcessParamService', {
        param_id: id,
      });

      return {
        success: true,
        data: existingProcessParam,
        message: 'Process param deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process param', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting process param:',
        'ProcessParamService',
        error,
      );
      throw new InternalServerErrorException('Error deleting process param');
    }
  }
}
