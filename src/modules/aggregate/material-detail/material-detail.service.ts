// material-detail.service.ts
import {
  Injectable,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CreateMaterialDetailDto,
  ReplaceCompositionDto,
} from './dto/material-detail.dto';
import { AppLogger } from '../../../common/logger/app-logger.service';
import { toPgHttpException } from '../../../common/utils/pg-error.util';
import { Material } from '../../material/entities/material.entity';
import { PerovskiteComposition } from '../../perovskite-composition/entities/perovskite-composition.entity';
import { MaterialSource } from '../../material-source/entities/material-source.entity';

/**
 * Material + perovskite composition + sources (vendor) + where it is used
 */
@Injectable()
export class MaterialDetailService {
  constructor(
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get material detail by ID
   */
  async findById(id: number) {
    const material = await this.dataSource.manager.findOne(Material, {
      where: { material_id: id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    try {
      const [composition, sources, [usage]] = await Promise.all([
        this.dataSource.query<Record<string, unknown>[]>(
          `
          SELECT site, ion, fraction
          FROM perovskite_composition
          WHERE material_id = $1
          ORDER BY site, ion
          `,
          [id],
        ),
        this.dataSource.query<Record<string, unknown>[]>(
          `
          SELECT ms.*, v.name AS vendor_name, v.country AS vendor_country
          FROM material_source ms
          LEFT JOIN vendor v ON v.vendor_id = ms.vendor_id
          WHERE ms.material_id = $1
          ORDER BY ms.source_id
          `,
          [id],
        ),
        this.dataSource.query<Record<string, unknown>[]>(
          `
          SELECT
            (SELECT COUNT(*) FROM layer WHERE material_id = $1)::int AS layer_count,
            (SELECT COUNT(DISTINCT sample_id) FROM layer WHERE material_id = $1)::int AS sample_count,
            (SELECT COUNT(*) FROM layer_ingredient WHERE material_id = $1)::int AS ingredient_count,
            (SELECT COUNT(*) FROM solvent_component WHERE material_id = $1)::int AS solvent_component_count
          `,
          [id],
        ),
      ]);

      return {
        success: true,
        data: { ...material, composition, sources, usage },
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching material detail:',
        'MaterialDetailService',
        error,
      );
      throw new InternalServerErrorException('Error fetching material detail');
    }
  }

  /**
   * Create a material with its composition and sources in one transaction
   */
  async create(dto: CreateMaterialDetailDto) {
    if (!dto.name) {
      throw new BadRequestException('Missing required fields!');
    }

    const { composition, sources, ...materialFields } = dto;
    let materialId: number;

    try {
      materialId = await this.dataSource.transaction(async (manager) => {
        const material = await manager.save(
          manager.create(Material, {
            ...materialFields,
            // composition given -> it is a perovskite
            is_perovskite:
              materialFields.is_perovskite ?? !!composition?.length,
          }),
        );

        if (composition?.length) {
          await manager.insert(
            PerovskiteComposition,
            composition.map((c) => ({
              ...c,
              material_id: material.material_id,
            })),
          );
        }

        if (sources?.length) {
          await manager.save(
            sources.map((s) =>
              manager.create(MaterialSource, {
                ...s,
                material_id: material.material_id,
              }),
            ),
          );
        }

        return material.material_id;
      });
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Material', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating material detail:',
        'MaterialDetailService',
        error,
      );
      throw new InternalServerErrorException('Error creating material');
    }

    this.logger.debug('Material detail created', 'MaterialDetailService', {
      material_id: materialId,
      composition: composition?.length ?? 0,
      sources: sources?.length ?? 0,
    });

    const created = await this.findById(materialId);
    return { ...created, message: 'Material created successfully' };
  }

  /**
   * Replace the whole composition of a material (delete + insert in one transaction)
   */
  async replaceComposition(id: number, dto: ReplaceCompositionDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const material = await manager.findOne(Material, {
          where: { material_id: id },
        });

        if (!material) {
          throw new NotFoundException('Material not found');
        }

        await manager.delete(PerovskiteComposition, { material_id: id });

        if (dto.composition.length) {
          await manager.insert(
            PerovskiteComposition,
            dto.composition.map((c) => ({ ...c, material_id: id })),
          );
        }
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const httpError = toPgHttpException(error, 'Composition', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error replacing composition:',
        'MaterialDetailService',
        error,
      );
      throw new InternalServerErrorException('Error replacing composition');
    }

    this.logger.debug('Composition replaced', 'MaterialDetailService', {
      material_id: id,
      rows: dto.composition.length,
    });

    const updated = await this.findById(id);
    return { ...updated, message: 'Composition replaced successfully' };
  }
}
