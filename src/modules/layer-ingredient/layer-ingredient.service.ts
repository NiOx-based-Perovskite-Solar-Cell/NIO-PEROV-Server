// layer-ingredient.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LayerIngredient } from './entities/layer-ingredient.entity';
import {
  SearchLayerIngredientDto,
  CreateLayerIngredientDto,
  UpdateLayerIngredientDto,
} from './dto/layer-ingredient.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'ingredient_id',
  'layer_id',
  'material_id',
  'role',
  'solvent_system_id',
  'amount',
  'unit',
];

@Injectable()
export class LayerIngredientService {
  constructor(
    @InjectRepository(LayerIngredient)
    private layerIngredientRepo: Repository<LayerIngredient>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search layer ingredients with filters and pagination (no filter = get all)
   */
  async search(dto: SearchLayerIngredientDto) {
    let query = `
      SELECT li.*, m.name AS material_name, ss.label AS solvent_system_label, COUNT(*) OVER() as total_count
      FROM layer_ingredient li
      LEFT JOIN material m ON m.material_id = li.material_id
      LEFT JOIN solvent_system ss ON ss.solvent_system_id = li.solvent_system_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.ingredient_id !== undefined) {
      query += ` AND li.ingredient_id = $${index++}`;
      values.push(dto.ingredient_id);
    }

    if (dto.layer_id !== undefined) {
      query += ` AND li.layer_id = $${index++}`;
      values.push(dto.layer_id);
    }

    if (dto.material_id !== undefined) {
      query += ` AND li.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    if (dto.role !== undefined) {
      query += ` AND li.role = $${index++}`;
      values.push(dto.role);
    }

    if (dto.solvent_system_id !== undefined) {
      query += ` AND li.solvent_system_id = $${index++}`;
      values.push(dto.solvent_system_id);
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY li.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY li.ingredient_id ASC`;
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
      const result: LayerIngredient[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching layer ingredients:',
        'LayerIngredientService',
        error,
      );
      throw new InternalServerErrorException(
        'Error fetching layer ingredients',
      );
    }
  }

  /**
   * Get layer ingredient by ID
   */
  async findById(id: string) {
    const layerIngredient = await this.layerIngredientRepo.findOne({
      where: { ingredient_id: id },
    });

    if (!layerIngredient) {
      throw new NotFoundException('Layer ingredient not found');
    }

    return { success: true, data: layerIngredient };
  }

  /**
   * Create a new layer ingredient
   */
  async create(dto: CreateLayerIngredientDto) {
    if (dto.layer_id === undefined) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newLayerIngredient = this.layerIngredientRepo.create({
        layer_id: dto.layer_id,
        material_id: dto.material_id ?? null,
        role: dto.role ?? null,
        solvent_system_id: dto.solvent_system_id ?? null,
        amount: dto.amount ?? null,
        unit: dto.unit ?? null,
      });

      const savedLayerIngredient =
        await this.layerIngredientRepo.save(newLayerIngredient);

      this.logger.debug('Layer ingredient created', 'LayerIngredientService', {
        ingredient_id: savedLayerIngredient.ingredient_id,
      });

      return {
        success: true,
        data: savedLayerIngredient,
        message: 'Layer ingredient created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer ingredient', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating layer ingredient:',
        'LayerIngredientService',
        error,
      );
      throw new InternalServerErrorException('Error creating layer ingredient');
    }
  }

  /**
   * Update an existing layer ingredient
   */
  async update(id: string, dto: UpdateLayerIngredientDto) {
    // Check if layer ingredient exists
    const existingLayerIngredient = await this.layerIngredientRepo.findOne({
      where: { ingredient_id: id },
    });

    if (!existingLayerIngredient) {
      throw new NotFoundException('Layer ingredient not found');
    }

    // Build update object dynamically
    const updates: Partial<LayerIngredient> = {};

    if (dto.layer_id !== undefined) updates.layer_id = dto.layer_id;
    if (dto.material_id !== undefined) updates.material_id = dto.material_id;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.solvent_system_id !== undefined)
      updates.solvent_system_id = dto.solvent_system_id;
    if (dto.amount !== undefined) updates.amount = dto.amount;
    if (dto.unit !== undefined) updates.unit = dto.unit;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.layerIngredientRepo.update({ ingredient_id: id }, updates);

      const updatedLayerIngredient = await this.layerIngredientRepo.findOne({
        where: { ingredient_id: id },
      });

      this.logger.debug('Layer ingredient updated', 'LayerIngredientService', {
        ingredient_id: id,
      });

      return {
        success: true,
        data: updatedLayerIngredient,
        message: 'Layer ingredient updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer ingredient', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating layer ingredient:',
        'LayerIngredientService',
        error,
      );
      throw new InternalServerErrorException('Error updating layer ingredient');
    }
  }

  /**
   * Delete a layer ingredient by ID
   */
  async delete(id: string) {
    // Check if layer ingredient exists
    const existingLayerIngredient = await this.layerIngredientRepo.findOne({
      where: { ingredient_id: id },
    });

    if (!existingLayerIngredient) {
      throw new NotFoundException('Layer ingredient not found');
    }

    try {
      await this.layerIngredientRepo.delete({ ingredient_id: id });

      this.logger.debug('Layer ingredient deleted', 'LayerIngredientService', {
        ingredient_id: id,
      });

      return {
        success: true,
        data: existingLayerIngredient,
        message: 'Layer ingredient deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Layer ingredient', 'delete');
      if (httpError) throw httpError;
      this.logger.error(
        'Error deleting layer ingredient:',
        'LayerIngredientService',
        error,
      );
      throw new InternalServerErrorException('Error deleting layer ingredient');
    }
  }
}
