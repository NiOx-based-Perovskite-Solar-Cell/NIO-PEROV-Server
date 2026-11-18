// device.service.ts
import {
  Injectable,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  SearchDeviceDto,
  CreateDeviceDto,
  DEVICE_SORTABLE_COLUMNS,
} from './dto/device.dto';
import { AppLogger } from '../../../common/logger/app-logger.service';
import { toPgHttpException } from '../../../common/utils/pg-error.util';
import { Paper } from '../../paper/entities/paper.entity';
import { Sample } from '../../sample/entities/sample.entity';
import { Layer } from '../../layer/entities/layer.entity';
import { LayerIngredient } from '../../layer-ingredient/entities/layer-ingredient.entity';
import { ProcessStep } from '../../process-step/entities/process-step.entity';
import { ProcessParam } from '../../process-param/entities/process-param.entity';
import { Measurement } from '../../measurement/entities/measurement.entity';
import { StabilityTest } from '../../stability-test/entities/stability-test.entity';

// sort_by -> qualified column (sample and paper are joined)
const SORT_COLUMN_MAP: Record<string, string> = {
  sample_id: 's.sample_id',
  sample_no: 's.sample_no',
  year: 'p.year',
};

/**
 * A "device" = one sample with everything under it:
 * paper -> sample -> layers (ingredients, process steps -> params)
 *                 -> measurements, stability tests
 */
@Injectable()
export class DeviceService {
  constructor(
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Device summary list - one row per sample with paper info,
   * the perovskite layer material and all measurements
   */
  async search(dto: SearchDeviceDto) {
    let query = `
      SELECT
        s.sample_id, s.sample_no, s.label, s.architecture, s.is_control,
        (SELECT COUNT(*) FROM layer l WHERE l.sample_id = s.sample_id)::int AS layer_count,
        p.paper_id, p.doi, p.journal, p.year, p.title,
        psk.material_id AS perovskite_material_id,
        psk.name AS perovskite,
        COALESCE(meas.measurements, '[]') AS measurements,
        COUNT(*) OVER() as total_count
      FROM sample s
      JOIN paper p ON p.paper_id = s.paper_id
      LEFT JOIN LATERAL (
        SELECT m.material_id, m.name
        FROM layer l
        JOIN material m ON m.material_id = l.material_id
        WHERE l.sample_id = s.sample_id
          AND (l.role = 'psk' OR m.is_perovskite)
        ORDER BY l.position, l.sub_order
        LIMIT 1
      ) psk ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'property', pr.code,
            'statistic', me.statistic,
            'scan', me.scan,
            'value', me.value,
            'error', me.error,
            'unit', me.unit
          ) ORDER BY pr.code, me.statistic, me.scan
        ) AS measurements
        FROM measurement me
        JOIN property pr ON pr.property_id = me.property_id
        WHERE me.sample_id = s.sample_id
      ) meas ON TRUE
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.paper_id !== undefined) {
      query += ` AND s.paper_id = $${index++}`;
      values.push(dto.paper_id);
    }

    if (dto.doi !== undefined) {
      query += ` AND p.doi = $${index++}`;
      values.push(dto.doi);
    }

    if (dto.architecture !== undefined) {
      query += ` AND s.architecture = $${index++}`;
      values.push(dto.architecture);
    }

    if (typeof dto.is_control === 'boolean') {
      query += ` AND s.is_control = $${index++}`;
      values.push(dto.is_control);
    }

    if (dto.perovskite_material_id !== undefined) {
      query += ` AND psk.material_id = $${index++}`;
      values.push(dto.perovskite_material_id);
    }

    if (dto.year_from !== undefined) {
      query += ` AND p.year >= $${index++}`;
      values.push(dto.year_from);
    }

    if (dto.year_to !== undefined) {
      query += ` AND p.year <= $${index++}`;
      values.push(dto.year_to);
    }

    if (dto.keyword) {
      query += ` AND (p.doi ILIKE $${index} OR p.title ILIKE $${index} OR s.label ILIKE $${index} OR psk.name ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && DEVICE_SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${SORT_COLUMN_MAP[dto.sort_by]} ${order}`;
    } else {
      query += ` ORDER BY s.sample_id ASC`;
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
      const result: unknown[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching devices:', 'DeviceService', error);
      throw new InternalServerErrorException('Error fetching devices');
    }
  }

  /**
   * Full device tree of one sample
   */
  async findById(sampleId: string) {
    const [sample] = await this.dataSource.query<Record<string, unknown>[]>(
      `
      SELECT s.*, row_to_json(p.*) AS paper
      FROM sample s
      JOIN paper p ON p.paper_id = s.paper_id
      WHERE s.sample_id = $1
      `,
      [sampleId],
    );

    if (!sample) {
      throw new NotFoundException('Device not found');
    }

    try {
      const [layers, ingredients, steps, measurements, stabilityTests] =
        await Promise.all([
          this.dataSource.query<Record<string, unknown>[]>(
            `
            SELECT l.*, m.name AS material_name, m.formula AS material_formula
            FROM layer l
            LEFT JOIN material m ON m.material_id = l.material_id
            WHERE l.sample_id = $1
            ORDER BY l.position, l.sub_order
            `,
            [sampleId],
          ),
          this.dataSource.query<Record<string, unknown>[]>(
            `
            SELECT li.*, m.name AS material_name,
              ss.label AS solvent_system_label, ss.basis AS solvent_basis,
              (
                SELECT json_agg(json_build_object(
                  'material_id', sc.material_id,
                  'name', sm.name,
                  'fraction', sc.fraction
                ) ORDER BY sc.fraction DESC)
                FROM solvent_component sc
                JOIN material sm ON sm.material_id = sc.material_id
                WHERE sc.solvent_system_id = li.solvent_system_id
              ) AS solvent_components
            FROM layer_ingredient li
            JOIN layer l ON l.layer_id = li.layer_id
            LEFT JOIN material m ON m.material_id = li.material_id
            LEFT JOIN solvent_system ss ON ss.solvent_system_id = li.solvent_system_id
            WHERE l.sample_id = $1
            ORDER BY li.ingredient_id
            `,
            [sampleId],
          ),
          this.dataSource.query<Record<string, unknown>[]>(
            `
            SELECT ps.*, pt.code AS process_type_code, pt.category AS process_type_category,
              COALESCE((
                SELECT json_agg(pp.* ORDER BY pp.param_id)
                FROM process_param pp
                WHERE pp.step_id = ps.step_id
              ), '[]') AS params
            FROM process_step ps
            JOIN layer l ON l.layer_id = ps.layer_id
            LEFT JOIN process_type pt ON pt.process_type_id = ps.process_type_id
            WHERE l.sample_id = $1
            ORDER BY ps.layer_id, ps.step_order
            `,
            [sampleId],
          ),
          this.dataSource.query<Record<string, unknown>[]>(
            `
            SELECT me.*, pr.code AS property_code
            FROM measurement me
            LEFT JOIN property pr ON pr.property_id = me.property_id
            WHERE me.sample_id = $1
            ORDER BY pr.code, me.statistic, me.scan
            `,
            [sampleId],
          ),
          this.dataSource.query<Record<string, unknown>[]>(
            `SELECT * FROM stability_test WHERE sample_id = $1 ORDER BY test_id`,
            [sampleId],
          ),
        ]);

      const data = {
        ...sample,
        layers: layers.map((layer) => ({
          ...layer,
          ingredients: ingredients.filter((i) => i.layer_id === layer.layer_id),
          process_steps: steps.filter((s) => s.layer_id === layer.layer_id),
        })),
        measurements,
        stability_tests: stabilityTests,
      };

      return { success: true, data };
    } catch (error: unknown) {
      this.logger.error('Error fetching device:', 'DeviceService', error);
      throw new InternalServerErrorException('Error fetching device');
    }
  }

  /**
   * Create a whole device in one transaction - any failure rolls back everything
   */
  async create(dto: CreateDeviceDto, userId?: string) {
    if (!dto.paper_id && !dto.paper) {
      throw new BadRequestException('Either paper_id or paper is required!');
    }

    let sampleId: string;

    try {
      sampleId = await this.dataSource.transaction(async (manager) => {
        const paperId = await this.resolvePaper(manager, dto, userId);

        const sample = await manager.save(
          manager.create(Sample, { ...dto.sample, paper_id: paperId }),
        );

        await this.insertStack(manager, sample.sample_id, dto);

        return sample.sample_id;
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const httpError = toPgHttpException(error, 'Device', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating device:', 'DeviceService', error);
      throw new InternalServerErrorException('Error creating device');
    }

    this.logger.log('Device created', 'DeviceService', {
      sample_id: sampleId,
      layers: dto.layers?.length ?? 0,
      measurements: dto.measurements?.length ?? 0,
    });

    const created = await this.findById(sampleId);
    return { ...created, message: 'Device created successfully' };
  }

  /**
   * Insert layers (-> ingredients, process steps -> params), measurements and
   * stability tests of one sample. Runs inside the caller's transaction
   */
  async insertStack(
    manager: EntityManager,
    sampleId: string,
    dto: Pick<CreateDeviceDto, 'layers' | 'measurements' | 'stability_tests'>,
  ) {
    for (const layerDto of dto.layers ?? []) {
      const { ingredients, process_steps, ...layerFields } = layerDto;

      const layer = await manager.save(
        manager.create(Layer, {
          ...layerFields,
          sample_id: sampleId,
        }),
      );

      if (ingredients?.length) {
        await manager.save(
          ingredients.map((i) =>
            manager.create(LayerIngredient, {
              ...i,
              layer_id: layer.layer_id,
            }),
          ),
        );
      }

      for (const stepDto of process_steps ?? []) {
        const { params, ...stepFields } = stepDto;

        const step = await manager.save(
          manager.create(ProcessStep, {
            ...stepFields,
            layer_id: layer.layer_id,
          }),
        );

        if (params?.length) {
          await manager.save(
            params.map((p) =>
              manager.create(ProcessParam, { ...p, step_id: step.step_id }),
            ),
          );
        }
      }
    }

    if (dto.measurements?.length) {
      await manager.save(
        dto.measurements.map((m) =>
          manager.create(Measurement, {
            ...m,
            sample_id: sampleId,
          }),
        ),
      );
    }

    if (dto.stability_tests?.length) {
      await manager.save(
        dto.stability_tests.map((t) =>
          manager.create(StabilityTest, {
            ...t,
            sample_id: sampleId,
          }),
        ),
      );
    }
  }

  /**
   * paper_id -> must exist; paper -> reuse by DOI, otherwise insert
   */
  private async resolvePaper(
    manager: EntityManager,
    dto: CreateDeviceDto,
    userId?: string,
  ): Promise<string> {
    if (dto.paper_id) {
      const paper = await manager.findOne(Paper, {
        where: { paper_id: dto.paper_id },
      });
      if (!paper) {
        throw new NotFoundException('Paper not found');
      }
      return paper.paper_id;
    }

    const paperDto = dto.paper!;

    if (paperDto.doi) {
      const existing = await manager.findOne(Paper, {
        where: { doi: paperDto.doi },
      });
      if (existing) {
        return existing.paper_id;
      }
    }

    const paper = await manager.save(
      manager.create(Paper, {
        ...paperDto,
        created_by: paperDto.created_by ?? userId ?? null,
      }),
    );
    return paper.paper_id;
  }
}
