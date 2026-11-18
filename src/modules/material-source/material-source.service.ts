// material-source.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MaterialSource } from './entities/material-source.entity';
import {
  SearchMaterialSourceDto,
  CreateMaterialSourceDto,
  UpdateMaterialSourceDto,
} from './dto/material-source.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'source_id',
  'material_id',
  'vendor_id',
  'purity_pct',
  'grade',
];

@Injectable()
export class MaterialSourceService {
  constructor(
    @InjectRepository(MaterialSource)
    private materialSourceRepo: Repository<MaterialSource>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search material sources with filters and pagination (no filter = get all)
   */
  async search(dto: SearchMaterialSourceDto) {
    let query = `
      SELECT ms.*, m.name AS material_name, v.name AS vendor_name, COUNT(*) OVER() as total_count
      FROM material_source ms
      LEFT JOIN material m ON m.material_id = ms.material_id
      LEFT JOIN vendor v ON v.vendor_id = ms.vendor_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.source_id !== undefined) {
      query += ` AND ms.source_id = $${index++}`;
      values.push(dto.source_id);
    }

    if (dto.material_id !== undefined) {
      query += ` AND ms.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    if (dto.vendor_id !== undefined) {
      query += ` AND ms.vendor_id = $${index++}`;
      values.push(dto.vendor_id);
    }

    if (dto.grade !== undefined) {
      query += ` AND ms.grade = $${index++}`;
      values.push(dto.grade);
    }

    if (dto.keyword) {
      query += ` AND (ms.grade ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ms.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY ms.source_id ASC`;
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
      const result: MaterialSource[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching material sources:',
        'MaterialSourceService',
        error,
      );
      throw new InternalServerErrorException('Error fetching material sources');
    }
  }

  /**
   * Get material source by ID
   */
  async findById(id: number) {
    const materialSource = await this.materialSourceRepo.findOne({
      where: { source_id: id },
    });

    if (!materialSource) {
      throw new NotFoundException('Material source not found');
    }

    return { success: true, data: materialSource };
  }

  /**
   * Create a new material source
   */
  async create(dto: CreateMaterialSourceDto) {
    if (dto.material_id === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newMaterialSource = this.materialSourceRepo.create({
        material_id: dto.material_id,
        vendor_id: dto.vendor_id ?? null,
        purity_pct: dto.purity_pct ?? null,
        grade: dto.grade ?? null,
      });

      const savedMaterialSource =
        await this.materialSourceRepo.save(newMaterialSource);

      this.logger.debug('Material source created', 'MaterialSourceService', {
        source_id: savedMaterialSource.source_id,
      });

      return {
        success: true,
        data: savedMaterialSource,
        message: 'Material source created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material source', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating material source:',
        'MaterialSourceService',
        error,
      );
      throw new InternalServerErrorException('Error creating material source');
    }
  }

  /**
   * Update an existing material source
   */
  async update(id: number, dto: UpdateMaterialSourceDto) {
    // Check if material source exists
    const existingMaterialSource = await this.materialSourceRepo.findOne({
      where: { source_id: id },
    });

    if (!existingMaterialSource) {
      throw new NotFoundException('Material source not found');
    }

    // Build update object dynamically
    const updates: Partial<MaterialSource> = {};

    if (dto.material_id !== undefined) updates.material_id = dto.material_id;
    if (dto.vendor_id !== undefined) updates.vendor_id = dto.vendor_id;
    if (dto.purity_pct !== undefined) updates.purity_pct = dto.purity_pct;
    if (dto.grade !== undefined) updates.grade = dto.grade;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.materialSourceRepo.update({ source_id: id }, updates);

      const updatedMaterialSource = await this.materialSourceRepo.findOne({
        where: { source_id: id },
      });

      this.logger.debug('Material source updated', 'MaterialSourceService', {
        source_id: id,
      });

      return {
        success: true,
        data: updatedMaterialSource,
        message: 'Material source updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material source', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating material source:',
        'MaterialSourceService',
        error,
      );
      throw new InternalServerErrorException('Error updating material source');
    }
  }

  /**
   * Delete a material source by ID
   */
  async delete(id: number) {
    // Check if material source exists
    const existingMaterialSource = await this.materialSourceRepo.findOne({
      where: { source_id: id },
    });

    if (!existingMaterialSource) {
      throw new NotFoundException('Material source not found');
    }

    try {
      await this.materialSourceRepo.delete({ source_id: id });

      this.logger.debug('Material source deleted', 'MaterialSourceService', {
        source_id: id,
      });

      return {
        success: true,
        data: existingMaterialSource,
        message: 'Material source deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material source', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting material source:',
        'MaterialSourceService',
        error,
      );
      throw new InternalServerErrorException('Error deleting material source');
    }
  }
}
