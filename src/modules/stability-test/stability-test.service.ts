// stability-test.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StabilityTest } from './entities/stability-test.entity';
import {
  SearchStabilityTestDto,
  CreateStabilityTestDto,
  UpdateStabilityTestDto,
} from './dto/stability-test.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'test_id',
  'sample_id',
  'atmosphere',
  'light',
  'mode',
  'isos_code',
  'encapsulated',
  'temperature_c',
  'rh_pct',
  'rh_min_pct',
  'rh_max_pct',
  'duration_h',
  'retention_pct',
  't80_h',
];

@Injectable()
export class StabilityTestService {
  constructor(
    @InjectRepository(StabilityTest)
    private stabilityTestRepo: Repository<StabilityTest>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search stability tests with filters and pagination (no filter = get all)
   */
  async search(dto: SearchStabilityTestDto) {
    let query = `
      SELECT st.*, COUNT(*) OVER() as total_count
      FROM stability_test st
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.test_id !== undefined) {
      query += ` AND st.test_id = $${index++}`;
      values.push(dto.test_id);
    }

    if (dto.sample_id !== undefined) {
      query += ` AND st.sample_id = $${index++}`;
      values.push(dto.sample_id);
    }

    if (dto.atmosphere !== undefined) {
      query += ` AND st.atmosphere = $${index++}`;
      values.push(dto.atmosphere);
    }

    if (dto.isos_code !== undefined) {
      query += ` AND st.isos_code = $${index++}`;
      values.push(dto.isos_code);
    }

    if (typeof dto.encapsulated === 'boolean') {
      query += ` AND st.encapsulated = $${index++}`;
      values.push(dto.encapsulated);
    }

    if (dto.keyword) {
      query += ` AND (st.atmosphere ILIKE $${index} OR st.light ILIKE $${index} OR st.mode ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY st.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY st.test_id ASC`;
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
      const result: StabilityTest[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching stability tests:',
        'StabilityTestService',
        error,
      );
      throw new InternalServerErrorException('Error fetching stability tests');
    }
  }

  /**
   * Get stability test by ID
   */
  async findById(id: string) {
    const stabilityTest = await this.stabilityTestRepo.findOne({
      where: { test_id: id },
    });

    if (!stabilityTest) {
      throw new NotFoundException('Stability test not found');
    }

    return { success: true, data: stabilityTest };
  }

  /**
   * Create a new stability test
   */
  async create(dto: CreateStabilityTestDto) {
    if (dto.sample_id === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newStabilityTest = this.stabilityTestRepo.create({
        sample_id: dto.sample_id,
        atmosphere: dto.atmosphere ?? null,
        light: dto.light ?? null,
        mode: dto.mode ?? null,
        isos_code: dto.isos_code ?? null,
        encapsulated: dto.encapsulated ?? null,
        temperature_c: dto.temperature_c ?? null,
        rh_pct: dto.rh_pct ?? null,
        rh_min_pct: dto.rh_min_pct ?? null,
        rh_max_pct: dto.rh_max_pct ?? null,
        duration_h: dto.duration_h ?? null,
        retention_pct: dto.retention_pct ?? null,
        t80_h: dto.t80_h ?? null,
      });

      const savedStabilityTest =
        await this.stabilityTestRepo.save(newStabilityTest);

      this.logger.debug('Stability test created', 'StabilityTestService', {
        test_id: savedStabilityTest.test_id,
      });

      return {
        success: true,
        data: savedStabilityTest,
        message: 'Stability test created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Stability test', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating stability test:',
        'StabilityTestService',
        error,
      );
      throw new InternalServerErrorException('Error creating stability test');
    }
  }

  /**
   * Update an existing stability test
   */
  async update(id: string, dto: UpdateStabilityTestDto) {
    // Check if stability test exists
    const existingStabilityTest = await this.stabilityTestRepo.findOne({
      where: { test_id: id },
    });

    if (!existingStabilityTest) {
      throw new NotFoundException('Stability test not found');
    }

    // Build update object dynamically
    const updates: Partial<StabilityTest> = {};

    if (dto.sample_id !== undefined) updates.sample_id = dto.sample_id;
    if (dto.atmosphere !== undefined) updates.atmosphere = dto.atmosphere;
    if (dto.light !== undefined) updates.light = dto.light;
    if (dto.mode !== undefined) updates.mode = dto.mode;
    if (dto.isos_code !== undefined) updates.isos_code = dto.isos_code;
    if (dto.encapsulated !== undefined) updates.encapsulated = dto.encapsulated;
    if (dto.temperature_c !== undefined)
      updates.temperature_c = dto.temperature_c;
    if (dto.rh_pct !== undefined) updates.rh_pct = dto.rh_pct;
    if (dto.rh_min_pct !== undefined) updates.rh_min_pct = dto.rh_min_pct;
    if (dto.rh_max_pct !== undefined) updates.rh_max_pct = dto.rh_max_pct;
    if (dto.duration_h !== undefined) updates.duration_h = dto.duration_h;
    if (dto.retention_pct !== undefined)
      updates.retention_pct = dto.retention_pct;
    if (dto.t80_h !== undefined) updates.t80_h = dto.t80_h;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.stabilityTestRepo.update({ test_id: id }, updates);

      const updatedStabilityTest = await this.stabilityTestRepo.findOne({
        where: { test_id: id },
      });

      this.logger.debug('Stability test updated', 'StabilityTestService', {
        test_id: id,
      });

      return {
        success: true,
        data: updatedStabilityTest,
        message: 'Stability test updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Stability test', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating stability test:',
        'StabilityTestService',
        error,
      );
      throw new InternalServerErrorException('Error updating stability test');
    }
  }

  /**
   * Delete a stability test by ID
   */
  async delete(id: string) {
    // Check if stability test exists
    const existingStabilityTest = await this.stabilityTestRepo.findOne({
      where: { test_id: id },
    });

    if (!existingStabilityTest) {
      throw new NotFoundException('Stability test not found');
    }

    try {
      await this.stabilityTestRepo.delete({ test_id: id });

      this.logger.debug('Stability test deleted', 'StabilityTestService', {
        test_id: id,
      });

      return {
        success: true,
        data: existingStabilityTest,
        message: 'Stability test deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Stability test', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting stability test:',
        'StabilityTestService',
        error,
      );
      throw new InternalServerErrorException('Error deleting stability test');
    }
  }
}
