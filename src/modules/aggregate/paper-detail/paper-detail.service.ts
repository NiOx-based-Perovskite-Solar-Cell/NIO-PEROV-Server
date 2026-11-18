// paper-detail.service.ts
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AppLogger } from '../../../common/logger/app-logger.service';
import { toPgHttpException } from '../../../common/utils/pg-error.util';
import { canonicalDoi } from '../../data/clean_data/lib/doi';
import { DeviceService } from '../device/device.service';
import {
  EntryLayerDto,
  EntrySolventDto,
  PaperEntrySampleDto,
  SavePaperEntryDto,
} from './dto/paper-detail.dto';
import { findMaterialByComposition } from '../../perovskite-composition/perovskite-composition.service';
import { DeviceLayerDto } from '../device/dto/device.dto';

/**
 * Paper + creator + every sample of the paper as device summaries
 */
@Injectable()
export class PaperDetailService {
  constructor(
    private dataSource: DataSource,
    private readonly deviceService: DeviceService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get paper detail by ID
   */
  async findById(id: string) {
    const [paper] = await this.dataSource.query<Record<string, unknown>[]>(
      `
      SELECT p.*,
        CASE WHEN u.user_sys_id IS NULL THEN NULL ELSE json_build_object(
          'user_sys_id', u.user_sys_id,
          'email', u.email,
          'first_name', u.first_name,
          'last_name', u.last_name
        ) END AS creator
      FROM paper p
      LEFT JOIN user_sys u ON u.user_sys_id = p.created_by
      WHERE p.paper_id = $1
      `,
      [id],
    );

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    try {
      const { data: samples } = await this.deviceService.search({
        paper_id: id,
        sort_by: 'sample_no',
      });

      return {
        success: true,
        data: { ...paper, sample_count: samples.length, samples },
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching paper detail:',
        'PaperDetailService',
        error,
      );
      throw new InternalServerErrorException('Error fetching paper detail');
    }
  }

  /**
   * Create a paper (entered in the UI) together with its samples
   */
  async create(dto: SavePaperEntryDto, userId?: string) {
    return this.save(null, dto, userId);
  }

  /**
   * Update a paper and its samples. Samples not listed are left untouched
   */
  async update(id: string, dto: SavePaperEntryDto) {
    return this.save(id, dto);
  }

  private async save(
    paperId: string | null,
    dto: SavePaperEntryDto,
    userId?: string,
  ) {
    const doi = canonicalDoi(dto.paper.doi);
    const isCreate = paperId === null;
    let savedId: string;

    try {
      savedId = await this.dataSource.transaction(async (manager) => {
        // DOI is unique case-insensitively (lower), not just as typed
        const [duplicate] = await manager.query<{ paper_id: string }[]>(
          `SELECT paper_id FROM paper WHERE lower(doi) = $1 AND paper_id IS DISTINCT FROM $2`,
          [doi, paperId],
        );
        if (duplicate) {
          throw new ConflictException(
            `Paper with this DOI already exists (paper_id ${duplicate.paper_id})`,
          );
        }

        const paperValues = [
          doi,
          dto.paper.title ?? null,
          dto.paper.journal ?? null,
          dto.paper.year ?? null,
        ];

        if (paperId === null) {
          const [created] = await manager.query<{ paper_id: string }[]>(
            `INSERT INTO paper (doi, title, journal, year, source, created_by)
             VALUES ($1, $2, $3, $4, '{manual}', $5)
             RETURNING paper_id`,
            [...paperValues, userId ?? null],
          );
          paperId = created.paper_id;
        } else {
          const updated: unknown[] = await manager.query(
            `UPDATE paper SET doi = $1, title = $2, journal = $3, year = $4, updated_at = NOW()
             WHERE paper_id = $5
             RETURNING paper_id`,
            [...paperValues, paperId],
          );
          // query() on UPDATE returns [rows, affectedCount]
          if (!(updated[0] as unknown[]).length) {
            throw new NotFoundException('Paper not found');
          }
        }

        await this.saveSamples(manager, paperId, dto);
        return paperId;
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const httpError = toPgHttpException(
        error,
        'Paper',
        isCreate ? 'create' : 'update',
      );
      if (httpError) throw httpError;
      this.logger.error(
        'Error saving paper entry:',
        'PaperDetailService',
        error,
      );
      throw new InternalServerErrorException('Error saving paper entry');
    }

    this.logger.log('Paper entry saved', 'PaperDetailService', {
      paper_id: savedId,
      samples: dto.samples.length,
    });

    return this.findById(savedId);
  }

  private async saveSamples(
    manager: EntityManager,
    paperId: string,
    dto: SavePaperEntryDto,
  ) {
    const existing: { sample_id: string; sample_no: number | null }[] =
      await manager.query(
        `SELECT sample_id, sample_no FROM sample WHERE paper_id = $1`,
        [paperId],
      );
    const existingIds = new Set(existing.map((s) => String(s.sample_id)));
    let nextNo = Math.max(0, ...existing.map((s) => s.sample_no ?? 0)) + 1;

    for (const sample of dto.samples) {
      const values = [
        sample.label ?? null,
        sample.is_control ?? false,
        dto.architecture ?? null,
      ];

      if (sample.sample_id) {
        if (!existingIds.has(sample.sample_id)) {
          throw new BadRequestException(
            `Sample ${sample.sample_id} does not belong to this paper`,
          );
        }
        await manager.query(
          `UPDATE sample SET label = $1, is_control = $2, architecture = $3, updated_at = NOW()
           WHERE sample_id = $4`,
          [...values, sample.sample_id],
        );
        await this.replaceStack(manager, sample.sample_id, sample);
        continue;
      }

      const [created] = await manager.query<{ sample_id: string }[]>(
        `INSERT INTO sample (paper_id, sample_no, label, is_control, architecture)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING sample_id`,
        [paperId, nextNo++, ...values],
      );

      await this.replaceStack(manager, created.sample_id, sample);
    }
  }

  /**
   * Replace the stack / results of one sample with what was sent. Each part
   * (layers, measurements, stability_tests) is replaced only when it is sent
   */
  private async replaceStack(
    manager: EntityManager,
    sampleId: string,
    sample: PaperEntrySampleDto,
  ) {
    // layer delete cascades to ingredients, process steps and params
    if (sample.layers) {
      await manager.query(`DELETE FROM layer WHERE sample_id = $1`, [sampleId]);
    }
    if (sample.measurements) {
      await manager.query(`DELETE FROM measurement WHERE sample_id = $1`, [
        sampleId,
      ]);
    }
    if (sample.stability_tests) {
      await manager.query(`DELETE FROM stability_test WHERE sample_id = $1`, [
        sampleId,
      ]);
    }

    const layers: DeviceLayerDto[] = [];
    for (const layer of sample.layers ?? []) {
      const { material_name, composition, solvent, ...fields } = layer;
      const materialId =
        layer.material_id ??
        (await this.resolvePerovskite(manager, material_name, composition));
      const solventSystemId = solvent
        ? await this.resolveSolvent(manager, solvent)
        : null;

      let ingredients = (fields.ingredients ?? []).map((i) => ({
        ...i,
        solvent_system_id: i.solvent_system_id ?? solventSystemId ?? undefined,
      }));
      // solvent but no listed ingredient -> keep the solvent as the solution itself
      if (solventSystemId && ingredients.length === 0) {
        ingredients = [
          { role: 'solution', solvent_system_id: solventSystemId },
        ];
      }

      layers.push({
        ...fields,
        material_id: materialId ?? undefined,
        ingredients,
      });
    }

    await this.deviceService.insertStack(manager, sampleId, {
      layers,
      measurements: sample.measurements,
      stability_tests: sample.stability_tests,
    });
  }

  /**
   * Perovskite typed as a formula: reuse the material with the same
   * composition, otherwise create it (material + perovskite_composition)
   */
  private async resolvePerovskite(
    manager: EntityManager,
    name: EntryLayerDto['material_name'],
    composition: EntryLayerDto['composition'],
  ): Promise<number | null> {
    if (!composition?.length) {
      if (name) {
        throw new BadRequestException(
          `Material "${name}" is not in the dictionary`,
        );
      }
      return null;
    }

    const existing = await findMaterialByComposition(manager, composition);
    if (existing) return existing.material_id;

    const label = name?.trim();
    if (!label) {
      throw new BadRequestException('New perovskite material needs a name');
    }
    const [sameName] = await manager.query<{ material_id: number }[]>(
      `SELECT material_id FROM material WHERE lower(name) = lower($1)`,
      [label],
    );
    if (sameName) {
      throw new BadRequestException(
        `Material "${label}" already exists with a different composition`,
      );
    }

    const [created] = await manager.query<{ material_id: number }[]>(
      `INSERT INTO material (name, category, formula, is_perovskite)
       VALUES ($1, 'perovskite', $1, true)
       RETURNING material_id`,
      [label],
    );
    await manager.query(
      `INSERT INTO perovskite_composition (material_id, site, ion, fraction)
       SELECT $1, c.site, c.ion, c.fraction
       FROM jsonb_to_recordset($2::jsonb) AS c(site text, ion text, fraction numeric)`,
      [created.material_id, JSON.stringify(composition)],
    );
    return created.material_id;
  }

  /**
   * Solvent mix as entered (ratios) -> fractions summing to 1. Reuses the
   * solvent system with the same basis and components, otherwise creates one
   */
  private async resolveSolvent(
    manager: EntityManager,
    solvent: EntrySolventDto,
  ): Promise<number> {
    const total = solvent.components.reduce((sum, c) => sum + c.ratio, 0);
    const components = solvent.components.map((c) => ({
      material_id: c.material_id,
      fraction: Number((c.ratio / total).toFixed(4)),
    }));
    const params = [solvent.basis, JSON.stringify(components)];

    const [existing] = await manager.query<{ solvent_system_id: number }[]>(
      `
      WITH want AS (
        SELECT * FROM jsonb_to_recordset($2::jsonb)
          AS w(material_id int, fraction numeric)
      )
      SELECT ss.solvent_system_id
      FROM solvent_system ss
      WHERE ss.basis = $1
        AND (SELECT COUNT(*) FROM solvent_component sc
             WHERE sc.solvent_system_id = ss.solvent_system_id) = (SELECT COUNT(*) FROM want)
        AND NOT EXISTS (
          SELECT 1 FROM want w
          WHERE NOT EXISTS (
            SELECT 1 FROM solvent_component sc
            WHERE sc.solvent_system_id = ss.solvent_system_id
              AND sc.material_id = w.material_id
              AND abs(sc.fraction - w.fraction) < 0.0001
          )
        )
      ORDER BY ss.solvent_system_id
      LIMIT 1
      `,
      params,
    );
    if (existing) return existing.solvent_system_id;

    // label e.g. "DMF:DMSO 0.8:0.2"
    const [created] = await manager.query<{ solvent_system_id: number }[]>(
      `
      WITH want AS (
        SELECT w.*, m.name
        FROM ROWS FROM (
          jsonb_to_recordset($2::jsonb) AS (material_id int, fraction numeric)
        ) WITH ORDINALITY AS w(material_id, fraction, ord)
        JOIN material m ON m.material_id = w.material_id
      )
      INSERT INTO solvent_system (label, basis)
      SELECT string_agg(name, ':' ORDER BY ord) || ' ' ||
             string_agg(trim_scale(fraction)::text, ':' ORDER BY ord), $1
      FROM want
      RETURNING solvent_system_id
      `,
      params,
    );
    await manager.query(
      `INSERT INTO solvent_component (solvent_system_id, material_id, fraction)
       SELECT $1, c.material_id, c.fraction
       FROM jsonb_to_recordset($2::jsonb) AS c(material_id int, fraction numeric)`,
      [created.solvent_system_id, params[1]],
    );
    return created.solvent_system_id;
  }
}
