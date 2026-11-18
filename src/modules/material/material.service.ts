// material.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Material } from './entities/material.entity';
import {
  SearchMaterialDto,
  CreateMaterialDto,
  UpdateMaterialDto,
} from './dto/material.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'material_id',
  'name',
  'category',
  'form',
  'formula',
  'is_perovskite',
];

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search materials with filters and pagination (no filter = get all)
   */
  async search(dto: SearchMaterialDto) {
    let query = `
      SELECT m.*, COUNT(*) OVER() as total_count
      FROM material m
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.material_id !== undefined) {
      query += ` AND m.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    if (dto.name !== undefined) {
      query += ` AND m.name = $${index++}`;
      values.push(dto.name);
    }

    if (dto.category !== undefined) {
      query += ` AND m.category = $${index++}`;
      values.push(dto.category);
    }

    if (dto.form !== undefined) {
      query += ` AND m.form = $${index++}`;
      values.push(dto.form);
    }

    if (typeof dto.is_perovskite === 'boolean') {
      query += ` AND m.is_perovskite = $${index++}`;
      values.push(dto.is_perovskite);
    }

    if (dto.keyword) {
      query += ` AND (m.name ILIKE $${index} OR m.formula ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY m.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY m.material_id ASC`;
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
      const result: Material[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching materials:', 'MaterialService', error);
      throw new InternalServerErrorException('Error fetching materials');
    }
  }

  /**
   * Get material by ID
   */
  async findById(id: number) {
    const material = await this.materialRepo.findOne({
      where: { material_id: id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return { success: true, data: material };
  }

  /**
   * Create a new material
   */
  async create(dto: CreateMaterialDto) {
    if (dto.name === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newMaterial = this.materialRepo.create({
        name: dto.name,
        category: dto.category ?? null,
        form: dto.form ?? null,
        formula: dto.formula ?? null,
        is_perovskite: dto.is_perovskite,
      });

      const savedMaterial = await this.materialRepo.save(newMaterial);

      this.logger.debug('Material created', 'MaterialService', {
        material_id: savedMaterial.material_id,
      });

      return {
        success: true,
        data: savedMaterial,
        message: 'Material created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating material:', 'MaterialService', error);
      throw new InternalServerErrorException('Error creating material');
    }
  }

  /**
   * Update an existing material
   */
  async update(id: number, dto: UpdateMaterialDto) {
    // Check if material exists
    const existingMaterial = await this.materialRepo.findOne({
      where: { material_id: id },
    });

    if (!existingMaterial) {
      throw new NotFoundException('Material not found');
    }

    // Build update object dynamically
    const updates: Partial<Material> = {};

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.form !== undefined) updates.form = dto.form;
    if (dto.formula !== undefined) updates.formula = dto.formula;
    if (dto.is_perovskite !== undefined)
      updates.is_perovskite = dto.is_perovskite;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.materialRepo.update({ material_id: id }, updates);

      const updatedMaterial = await this.materialRepo.findOne({
        where: { material_id: id },
      });

      this.logger.debug('Material updated', 'MaterialService', {
        material_id: id,
      });

      return {
        success: true,
        data: updatedMaterial,
        message: 'Material updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating material:', 'MaterialService', error);
      throw new InternalServerErrorException('Error updating material');
    }
  }

  /**
   * Delete a material by ID
   */
  async delete(id: number) {
    // Check if material exists
    const existingMaterial = await this.materialRepo.findOne({
      where: { material_id: id },
    });

    if (!existingMaterial) {
      throw new NotFoundException('Material not found');
    }

    try {
      await this.materialRepo.delete({ material_id: id });

      this.logger.debug('Material deleted', 'MaterialService', {
        material_id: id,
      });

      return {
        success: true,
        data: existingMaterial,
        message: 'Material deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting material:', 'MaterialService', error);
      throw new InternalServerErrorException('Error deleting material');
    }
  }
}
