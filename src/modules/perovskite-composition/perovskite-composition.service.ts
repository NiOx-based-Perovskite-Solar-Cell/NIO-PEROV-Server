// perovskite-composition.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PerovskiteComposition } from './entities/perovskite-composition.entity';
import {
  SearchPerovskiteCompositionDto,
  CreatePerovskiteCompositionDto,
  UpdatePerovskiteCompositionDto,
  ResolveCompositionDto,
} from './dto/perovskite-composition.dto';
import { parsePerovskite, siteSums } from '../data/clean_data/lib/perovskite';
import { IonFraction } from '../data/clean_data/interface/clean-data.types';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

/**
 * The perovskite material whose composition is exactly this set of ions
 * (same ions, fractions equal within 1e-4), or null. Works inside a
 * transaction too: pass the EntityManager as `runner`
 */
export async function findMaterialByComposition(
  runner: Pick<DataSource, 'query'> | Pick<EntityManager, 'query'>,
  composition: IonFraction[],
): Promise<{ material_id: number; name: string } | null> {
  const [material] = await runner.query<
    { material_id: number; name: string }[]
  >(
    `
    WITH want AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb)
        AS w(site text, ion text, fraction numeric)
    )
    SELECT m.material_id, m.name
    FROM material m
    WHERE m.is_perovskite
      AND (SELECT COUNT(*) FROM perovskite_composition pc
           WHERE pc.material_id = m.material_id) = (SELECT COUNT(*) FROM want)
      AND NOT EXISTS (
        SELECT 1 FROM want w
        WHERE NOT EXISTS (
          SELECT 1 FROM perovskite_composition pc
          WHERE pc.material_id = m.material_id
            AND pc.site = w.site
            AND pc.ion = w.ion
            AND abs(pc.fraction - w.fraction) < 0.0001
        )
      )
    ORDER BY m.material_id
    LIMIT 1
    `,
    [JSON.stringify(composition)],
  );
  return material ?? null;
}

interface CompositionKey {
  material_id: number;
  site: string;
  ion: string;
}

@Injectable()
export class PerovskiteCompositionService {
  constructor(
    @InjectRepository(PerovskiteComposition)
    private compositionRepo: Repository<PerovskiteComposition>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search perovskite compositions with filters and pagination (no filter = get all)
   */
  async search(dto: SearchPerovskiteCompositionDto) {
    let query = `
      SELECT pc.*, m.name AS material_name, COUNT(*) OVER() as total_count
      FROM perovskite_composition pc
      LEFT JOIN material m ON m.material_id = pc.material_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.material_id !== undefined) {
      query += ` AND pc.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    if (dto.site !== undefined) {
      query += ` AND pc.site = $${index++}`;
      values.push(dto.site);
    }

    if (dto.ion !== undefined) {
      query += ` AND pc.ion = $${index++}`;
      values.push(dto.ion);
    }

    query += ` ORDER BY pc.material_id, pc.site, pc.ion`;

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
      const result: PerovskiteComposition[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching perovskite compositions:',
        'PerovskiteCompositionService',
        error,
      );
      throw new InternalServerErrorException(
        'Error fetching perovskite compositions',
      );
    }
  }

  /**
   * Get every composition row of a material
   */
  async findByMaterialId(materialId: number) {
    const rows = await this.compositionRepo.find({
      where: { material_id: materialId },
      order: { site: 'ASC', ion: 'ASC' },
    });

    return { success: true, data: rows };
  }

  /**
   * Parse a formula (or take a hand-typed composition) and find the material
   * whose composition is exactly the same - matching by composition, not by
   * name, so "FA0.9MA0.05Cs0.05PbI3" finds "Cs0.05MA0.05FA0.9PbI3".
   *
   * composition = null when the formula cannot be parsed
   * material    = null when no material has this composition yet
   */
  async resolve(dto: ResolveCompositionDto) {
    const composition: IonFraction[] | null = dto.composition?.length
      ? dto.composition
      : dto.formula
        ? parsePerovskite(dto.formula)
        : null;

    if (!composition) {
      return {
        success: true,
        data: { composition: null, sums: null, material: null },
      };
    }

    try {
      const material = await findMaterialByComposition(
        this.dataSource,
        composition,
      );

      return {
        success: true,
        data: {
          composition,
          sums: siteSums(composition),
          material: material ?? null,
        },
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error resolving composition:',
        'PerovskiteCompositionService',
        error,
      );
      throw new InternalServerErrorException('Error resolving composition');
    }
  }

  /**
   * Create a new composition row
   */
  async create(dto: CreatePerovskiteCompositionDto) {
    if (
      dto.material_id === undefined ||
      !dto.site ||
      !dto.ion ||
      dto.fraction === undefined
    ) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newComposition = this.compositionRepo.create({
        material_id: dto.material_id,
        site: dto.site,
        ion: dto.ion,
        fraction: dto.fraction,
      });

      // insert (not save) so an existing key is a 409, not a silent overwrite
      await this.compositionRepo.insert(newComposition);

      this.logger.debug(
        'Perovskite composition created',
        'PerovskiteCompositionService',
        { material_id: dto.material_id, site: dto.site, ion: dto.ion },
      );

      return {
        success: true,
        data: newComposition,
        message: 'Perovskite composition created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(
        error,
        'Perovskite composition',
        'create',
      );
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating perovskite composition:',
        'PerovskiteCompositionService',
        error,
      );
      throw new InternalServerErrorException(
        'Error creating perovskite composition',
      );
    }
  }

  /**
   * Update the fraction of a composition row
   */
  async update(key: CompositionKey, dto: UpdatePerovskiteCompositionDto) {
    const existingComposition = await this.compositionRepo.findOne({
      where: key,
    });

    if (!existingComposition) {
      throw new NotFoundException('Perovskite composition not found');
    }

    try {
      await this.compositionRepo.update(key, { fraction: dto.fraction });

      const updatedComposition = await this.compositionRepo.findOne({
        where: key,
      });

      this.logger.debug(
        'Perovskite composition updated',
        'PerovskiteCompositionService',
        key,
      );

      return {
        success: true,
        data: updatedComposition,
        message: 'Perovskite composition updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(
        error,
        'Perovskite composition',
        'update',
      );
      if (httpError) throw httpError;
      this.logger.error(
        'Error updating perovskite composition:',
        'PerovskiteCompositionService',
        error,
      );
      throw new InternalServerErrorException(
        'Error updating perovskite composition',
      );
    }
  }

  /**
   * Delete a composition row
   */
  async delete(key: CompositionKey) {
    const existingComposition = await this.compositionRepo.findOne({
      where: key,
    });

    if (!existingComposition) {
      throw new NotFoundException('Perovskite composition not found');
    }

    try {
      await this.compositionRepo.delete(key);

      this.logger.debug(
        'Perovskite composition deleted',
        'PerovskiteCompositionService',
        key,
      );

      return {
        success: true,
        data: existingComposition,
        message: 'Perovskite composition deleted successfully',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error deleting perovskite composition:',
        'PerovskiteCompositionService',
        error,
      );
      throw new InternalServerErrorException(
        'Error deleting perovskite composition',
      );
    }
  }
}
