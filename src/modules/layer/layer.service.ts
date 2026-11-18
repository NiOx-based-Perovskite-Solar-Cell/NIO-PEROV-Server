// layer.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Layer } from './entities/layer.entity';
import {
  SearchLayerDto,
  CreateLayerDto,
  UpdateLayerDto,
} from './dto/layer.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'layer_id',
  'sample_id',
  'position',
  'sub_order',
  'role',
  'material_id',
  'thickness_nm',
  'thickness_min_nm',
  'thickness_max_nm',
];

@Injectable()
export class LayerService {
  constructor(
    @InjectRepository(Layer)
    private layerRepo: Repository<Layer>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search layers with filters and pagination (no filter = get all)
   */
  async search(dto: SearchLayerDto) {
    let query = `
      SELECT l.*, m.name AS material_name, COUNT(*) OVER() as total_count
      FROM layer l
      LEFT JOIN material m ON m.material_id = l.material_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.layer_id !== undefined) {
      query += ` AND l.layer_id = $${index++}`;
      values.push(dto.layer_id);
    }

    if (dto.sample_id !== undefined) {
      query += ` AND l.sample_id = $${index++}`;
      values.push(dto.sample_id);
    }

    if (dto.position !== undefined) {
      query += ` AND l.position = $${index++}`;
      values.push(dto.position);
    }

    if (dto.role !== undefined) {
      query += ` AND l.role = $${index++}`;
      values.push(dto.role);
    }

    if (dto.material_id !== undefined) {
      query += ` AND l.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY l.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY l.layer_id ASC`;
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
      const result: Layer[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching layers:', 'LayerService', error);
      throw new InternalServerErrorException('Error fetching layers');
    }
  }

  /**
   * Get layer by ID
   */
  async findById(id: string) {
    const layer = await this.layerRepo.findOne({
      where: { layer_id: id },
    });

    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    return { success: true, data: layer };
  }

  /**
   * Create a new layer
   */
  async create(dto: CreateLayerDto) {
    if (dto.sample_id === undefined || dto.position === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newLayer = this.layerRepo.create({
        sample_id: dto.sample_id,
        position: dto.position,
        sub_order: dto.sub_order,
        role: dto.role ?? null,
        material_id: dto.material_id ?? null,
        thickness_nm: dto.thickness_nm ?? null,
        thickness_min_nm: dto.thickness_min_nm ?? null,
        thickness_max_nm: dto.thickness_max_nm ?? null,
      });

      const savedLayer = await this.layerRepo.save(newLayer);

      this.logger.debug('Layer created', 'LayerService', {
        layer_id: savedLayer.layer_id,
      });

      return {
        success: true,
        data: savedLayer,
        message: 'Layer created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating layer:', 'LayerService', error);
      throw new InternalServerErrorException('Error creating layer');
    }
  }

  /**
   * Update an existing layer
   */
  async update(id: string, dto: UpdateLayerDto) {
    // Check if layer exists
    const existingLayer = await this.layerRepo.findOne({
      where: { layer_id: id },
    });

    if (!existingLayer) {
      throw new NotFoundException('Layer not found');
    }

    // Build update object dynamically
    const updates: Partial<Layer> = {};

    if (dto.sample_id !== undefined) updates.sample_id = dto.sample_id;
    if (dto.position !== undefined) updates.position = dto.position;
    if (dto.sub_order !== undefined) updates.sub_order = dto.sub_order;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.material_id !== undefined) updates.material_id = dto.material_id;
    if (dto.thickness_nm !== undefined) updates.thickness_nm = dto.thickness_nm;
    if (dto.thickness_min_nm !== undefined)
      updates.thickness_min_nm = dto.thickness_min_nm;
    if (dto.thickness_max_nm !== undefined)
      updates.thickness_max_nm = dto.thickness_max_nm;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.layerRepo.update({ layer_id: id }, updates);

      const updatedLayer = await this.layerRepo.findOne({
        where: { layer_id: id },
      });

      this.logger.debug('Layer updated', 'LayerService', { layer_id: id });

      return {
        success: true,
        data: updatedLayer,
        message: 'Layer updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating layer:', 'LayerService', error);
      throw new InternalServerErrorException('Error updating layer');
    }
  }

  /**
   * Delete a layer by ID
   */
  async delete(id: string) {
    // Check if layer exists
    const existingLayer = await this.layerRepo.findOne({
      where: { layer_id: id },
    });

    if (!existingLayer) {
      throw new NotFoundException('Layer not found');
    }

    try {
      await this.layerRepo.delete({ layer_id: id });

      this.logger.debug('Layer deleted', 'LayerService', { layer_id: id });

      return {
        success: true,
        data: existingLayer,
        message: 'Layer deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting layer:', 'LayerService', error);
      throw new InternalServerErrorException('Error deleting layer');
    }
  }
}
