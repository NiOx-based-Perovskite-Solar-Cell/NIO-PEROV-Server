// solvent-system.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SolventSystem } from './entities/solvent-system.entity';
import {
  SearchSolventSystemDto,
  CreateSolventSystemDto,
  UpdateSolventSystemDto,
} from './dto/solvent-system.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = ['solvent_system_id', 'label', 'basis'];

@Injectable()
export class SolventSystemService {
  constructor(
    @InjectRepository(SolventSystem)
    private solventSystemRepo: Repository<SolventSystem>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search solvent systems with filters and pagination (no filter = get all)
   */
  async search(dto: SearchSolventSystemDto) {
    let query = `
      SELECT ss.*, COUNT(*) OVER() as total_count
      FROM solvent_system ss
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.solvent_system_id !== undefined) {
      query += ` AND ss.solvent_system_id = $${index++}`;
      values.push(dto.solvent_system_id);
    }

    if (dto.label !== undefined) {
      query += ` AND ss.label = $${index++}`;
      values.push(dto.label);
    }

    if (dto.basis !== undefined) {
      query += ` AND ss.basis = $${index++}`;
      values.push(dto.basis);
    }

    if (dto.keyword) {
      query += ` AND (ss.label ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ss.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY ss.solvent_system_id ASC`;
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
      const result: SolventSystem[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching solvent systems:',
        'SolventSystemService',
        error,
      );
      throw new InternalServerErrorException('Error fetching solvent systems');
    }
  }

  /**
   * Get solvent system by ID
   */
  async findById(id: number) {
    const solventSystem = await this.solventSystemRepo.findOne({
      where: { solvent_system_id: id },
    });

    if (!solventSystem) {
      throw new NotFoundException('Solvent system not found');
    }

    return { success: true, data: solventSystem };
  }

  /**
   * Create a new solvent system
   */
  async create(dto: CreateSolventSystemDto) {
    try {
      const newSolventSystem = this.solventSystemRepo.create({
        label: dto.label ?? null,
        basis: dto.basis,
      });

      const savedSolventSystem =
        await this.solventSystemRepo.save(newSolventSystem);

      this.logger.debug('Solvent system created', 'SolventSystemService', {
        solvent_system_id: savedSolventSystem.solvent_system_id,
      });

      return {
        success: true,
        data: savedSolventSystem,
        message: 'Solvent system created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Solvent system', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating solvent system:',
        'SolventSystemService',
        error,
      );
      throw new InternalServerErrorException('Error creating solvent system');
    }
  }

  /**
   * Update an existing solvent system
   */
  async update(id: number, dto: UpdateSolventSystemDto) {
    // Check if solvent system exists
    const existingSolventSystem = await this.solventSystemRepo.findOne({
      where: { solvent_system_id: id },
    });

    if (!existingSolventSystem) {
      throw new NotFoundException('Solvent system not found');
    }

    // Build update object dynamically
    const updates: Partial<SolventSystem> = {};

    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.basis !== undefined) updates.basis = dto.basis;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.solventSystemRepo.update({ solvent_system_id: id }, updates);

      const updatedSolventSystem = await this.solventSystemRepo.findOne({
        where: { solvent_system_id: id },
      });

      this.logger.debug('Solvent system updated', 'SolventSystemService', {
        solvent_system_id: id,
      });

      return {
        success: true,
        data: updatedSolventSystem,
        message: 'Solvent system updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Solvent system', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating solvent system:',
        'SolventSystemService',
        error,
      );
      throw new InternalServerErrorException('Error updating solvent system');
    }
  }

  /**
   * Delete a solvent system by ID
   */
  async delete(id: number) {
    // Check if solvent system exists
    const existingSolventSystem = await this.solventSystemRepo.findOne({
      where: { solvent_system_id: id },
    });

    if (!existingSolventSystem) {
      throw new NotFoundException('Solvent system not found');
    }

    try {
      await this.solventSystemRepo.delete({ solvent_system_id: id });

      this.logger.debug('Solvent system deleted', 'SolventSystemService', {
        solvent_system_id: id,
      });

      return {
        success: true,
        data: existingSolventSystem,
        message: 'Solvent system deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Solvent system', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting solvent system:',
        'SolventSystemService',
        error,
      );
      throw new InternalServerErrorException('Error deleting solvent system');
    }
  }
}
