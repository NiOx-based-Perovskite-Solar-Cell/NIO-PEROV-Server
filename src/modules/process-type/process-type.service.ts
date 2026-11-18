// process-type.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProcessType } from './entities/process-type.entity';
import {
  SearchProcessTypeDto,
  CreateProcessTypeDto,
  UpdateProcessTypeDto,
} from './dto/process-type.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = ['process_type_id', 'code', 'category'];

@Injectable()
export class ProcessTypeService {
  constructor(
    @InjectRepository(ProcessType)
    private processTypeRepo: Repository<ProcessType>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search process types with filters and pagination (no filter = get all)
   */
  async search(dto: SearchProcessTypeDto) {
    let query = `
      SELECT pt.*, COUNT(*) OVER() as total_count
      FROM process_type pt
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.process_type_id !== undefined) {
      query += ` AND pt.process_type_id = $${index++}`;
      values.push(dto.process_type_id);
    }

    if (dto.code !== undefined) {
      query += ` AND pt.code = $${index++}`;
      values.push(dto.code);
    }

    if (dto.category !== undefined) {
      query += ` AND pt.category = $${index++}`;
      values.push(dto.category);
    }

    if (dto.keyword) {
      query += ` AND (pt.code ILIKE $${index} OR pt.category ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY pt.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY pt.process_type_id ASC`;
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
      const result: ProcessType[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching process types:',
        'ProcessTypeService',
        error,
      );
      throw new InternalServerErrorException('Error fetching process types');
    }
  }

  /**
   * Get process type by ID
   */
  async findById(id: number) {
    const processType = await this.processTypeRepo.findOne({
      where: { process_type_id: id },
    });

    if (!processType) {
      throw new NotFoundException('Process type not found');
    }

    return { success: true, data: processType };
  }

  /**
   * Create a new process type
   */
  async create(dto: CreateProcessTypeDto) {
    if (dto.code === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newProcessType = this.processTypeRepo.create({
        code: dto.code,
        category: dto.category ?? null,
        param_template: dto.param_template,
      });

      const savedProcessType = await this.processTypeRepo.save(newProcessType);

      this.logger.debug('Process type created', 'ProcessTypeService', {
        process_type_id: savedProcessType.process_type_id,
      });

      return {
        success: true,
        data: savedProcessType,
        message: 'Process type created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process type', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating process type:',
        'ProcessTypeService',
        error,
      );
      throw new InternalServerErrorException('Error creating process type');
    }
  }

  /**
   * Update an existing process type
   */
  async update(id: number, dto: UpdateProcessTypeDto) {
    // Check if process type exists
    const existingProcessType = await this.processTypeRepo.findOne({
      where: { process_type_id: id },
    });

    if (!existingProcessType) {
      throw new NotFoundException('Process type not found');
    }

    // Build update object dynamically
    const updates: Partial<ProcessType> = {};

    if (dto.code !== undefined) updates.code = dto.code;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.param_template !== undefined)
      updates.param_template = dto.param_template;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.processTypeRepo.update({ process_type_id: id }, updates);

      const updatedProcessType = await this.processTypeRepo.findOne({
        where: { process_type_id: id },
      });

      this.logger.debug('Process type updated', 'ProcessTypeService', {
        process_type_id: id,
      });

      return {
        success: true,
        data: updatedProcessType,
        message: 'Process type updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process type', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating process type:',
        'ProcessTypeService',
        error,
      );
      throw new InternalServerErrorException('Error updating process type');
    }
  }

  /**
   * Delete a process type by ID
   */
  async delete(id: number) {
    // Check if process type exists
    const existingProcessType = await this.processTypeRepo.findOne({
      where: { process_type_id: id },
    });

    if (!existingProcessType) {
      throw new NotFoundException('Process type not found');
    }

    try {
      await this.processTypeRepo.delete({ process_type_id: id });

      this.logger.debug('Process type deleted', 'ProcessTypeService', {
        process_type_id: id,
      });

      return {
        success: true,
        data: existingProcessType,
        message: 'Process type deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process type', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting process type:',
        'ProcessTypeService',
        error,
      );
      throw new InternalServerErrorException('Error deleting process type');
    }
  }
}
