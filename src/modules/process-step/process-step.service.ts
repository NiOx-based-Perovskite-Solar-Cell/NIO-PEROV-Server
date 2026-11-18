// process-step.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProcessStep } from './entities/process-step.entity';
import {
  SearchProcessStepDto,
  CreateProcessStepDto,
  UpdateProcessStepDto,
} from './dto/process-step.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'step_id',
  'layer_id',
  'step_order',
  'process_type_id',
  'scope',
  'description',
];

@Injectable()
export class ProcessStepService {
  constructor(
    @InjectRepository(ProcessStep)
    private processStepRepo: Repository<ProcessStep>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search process steps with filters and pagination (no filter = get all)
   */
  async search(dto: SearchProcessStepDto) {
    let query = `
      SELECT ps.*, pt.code AS process_type_code, COUNT(*) OVER() as total_count
      FROM process_step ps
      LEFT JOIN process_type pt ON pt.process_type_id = ps.process_type_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.step_id !== undefined) {
      query += ` AND ps.step_id = $${index++}`;
      values.push(dto.step_id);
    }

    if (dto.layer_id !== undefined) {
      query += ` AND ps.layer_id = $${index++}`;
      values.push(dto.layer_id);
    }

    if (dto.step_order !== undefined) {
      query += ` AND ps.step_order = $${index++}`;
      values.push(dto.step_order);
    }

    if (dto.process_type_id !== undefined) {
      query += ` AND ps.process_type_id = $${index++}`;
      values.push(dto.process_type_id);
    }

    if (dto.scope !== undefined) {
      query += ` AND ps.scope = $${index++}`;
      values.push(dto.scope);
    }

    if (dto.keyword) {
      query += ` AND (ps.description ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ps.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY ps.step_id ASC`;
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
      const result: ProcessStep[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching process steps:',
        'ProcessStepService',
        error,
      );
      throw new InternalServerErrorException('Error fetching process steps');
    }
  }

  /**
   * Get process step by ID
   */
  async findById(id: string) {
    const processStep = await this.processStepRepo.findOne({
      where: { step_id: id },
    });

    if (!processStep) {
      throw new NotFoundException('Process step not found');
    }

    return { success: true, data: processStep };
  }

  /**
   * Create a new process step
   */
  async create(dto: CreateProcessStepDto) {
    if (dto.layer_id === undefined || dto.step_order === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newProcessStep = this.processStepRepo.create({
        layer_id: dto.layer_id,
        step_order: dto.step_order,
        process_type_id: dto.process_type_id ?? null,
        scope: dto.scope ?? null,
        description: dto.description ?? null,
      });

      const savedProcessStep = await this.processStepRepo.save(newProcessStep);

      this.logger.debug('Process step created', 'ProcessStepService', {
        step_id: savedProcessStep.step_id,
      });

      return {
        success: true,
        data: savedProcessStep,
        message: 'Process step created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process step', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating process step:',
        'ProcessStepService',
        error,
      );
      throw new InternalServerErrorException('Error creating process step');
    }
  }

  /**
   * Update an existing process step
   */
  async update(id: string, dto: UpdateProcessStepDto) {
    // Check if process step exists
    const existingProcessStep = await this.processStepRepo.findOne({
      where: { step_id: id },
    });

    if (!existingProcessStep) {
      throw new NotFoundException('Process step not found');
    }

    // Build update object dynamically
    const updates: Partial<ProcessStep> = {};

    if (dto.layer_id !== undefined) updates.layer_id = dto.layer_id;
    if (dto.step_order !== undefined) updates.step_order = dto.step_order;
    if (dto.process_type_id !== undefined)
      updates.process_type_id = dto.process_type_id;
    if (dto.scope !== undefined) updates.scope = dto.scope;
    if (dto.description !== undefined) updates.description = dto.description;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.processStepRepo.update({ step_id: id }, updates);

      const updatedProcessStep = await this.processStepRepo.findOne({
        where: { step_id: id },
      });

      this.logger.debug('Process step updated', 'ProcessStepService', {
        step_id: id,
      });

      return {
        success: true,
        data: updatedProcessStep,
        message: 'Process step updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process step', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating process step:',
        'ProcessStepService',
        error,
      );
      throw new InternalServerErrorException('Error updating process step');
    }
  }

  /**
   * Delete a process step by ID
   */
  async delete(id: string) {
    // Check if process step exists
    const existingProcessStep = await this.processStepRepo.findOne({
      where: { step_id: id },
    });

    if (!existingProcessStep) {
      throw new NotFoundException('Process step not found');
    }

    try {
      await this.processStepRepo.delete({ step_id: id });

      this.logger.debug('Process step deleted', 'ProcessStepService', {
        step_id: id,
      });

      return {
        success: true,
        data: existingProcessStep,
        message: 'Process step deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Process step', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting process step:',
        'ProcessStepService',
        error,
      );
      throw new InternalServerErrorException('Error deleting process step');
    }
  }
}
