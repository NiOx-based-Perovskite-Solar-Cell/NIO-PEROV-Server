// paper.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Paper } from './entities/paper.entity';
import {
  SearchPaperDto,
  CreatePaperDto,
  UpdatePaperDto,
} from './dto/paper.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';
import { canonicalDoi } from '../data/clean_data/lib/doi';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'paper_id',
  'doi',
  'journal',
  'year',
  'title',
  'created_by',
  'created_at',
  'updated_at',
  'sample_count',
];

/**
 * Workflow status of a paper: 'draft' | 'review' | 'published'.
 * There is no submission table yet, so every paper in the DB counts as
 * published. Once the submission workflow exists, derive it here only.
 */
const PAPER_STATUS_SQL = `'published'::text`;

/** 'manual' = entered in the UI (no source file), 'excel' = imported from Excel files */
const PAPER_SOURCE_TYPE_SQL = `CASE WHEN cardinality(p.source) = 0 OR 'manual' = ANY(p.source) THEN 'manual' ELSE 'excel' END`;

@Injectable()
export class PaperService {
  constructor(
    @InjectRepository(Paper)
    private paperRepo: Repository<Paper>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search papers with filters and pagination (no filter = get all)
   */
  async search(dto: SearchPaperDto) {
    let query = `
      SELECT p.*, COUNT(*) OVER() as total_count
      FROM (
        SELECT p.*,
          (SELECT COUNT(*) FROM sample s WHERE s.paper_id = p.paper_id)::int AS sample_count,
          ${PAPER_SOURCE_TYPE_SQL} AS source_type,
          ${PAPER_STATUS_SQL} AS status
        FROM paper p
      ) p
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.paper_id !== undefined) {
      query += ` AND p.paper_id = $${index++}`;
      values.push(dto.paper_id);
    }

    if (dto.doi !== undefined) {
      // "https://doi.org/10.1002/X", "10_1002_x" and "10.1002/x" all match
      query += ` AND lower(p.doi) = $${index++}`;
      values.push(canonicalDoi(dto.doi));
    }

    if (dto.journal !== undefined) {
      query += ` AND p.journal = $${index++}`;
      values.push(dto.journal);
    }

    if (dto.year !== undefined) {
      query += ` AND p.year = $${index++}`;
      values.push(dto.year);
    }

    if (dto.created_by !== undefined) {
      query += ` AND p.created_by = $${index++}`;
      values.push(dto.created_by);
    }

    if (dto.keyword) {
      // material: the layer's own material or any of its ingredients
      query += ` AND (p.doi ILIKE $${index} OR p.journal ILIKE $${index} OR p.title ILIKE $${index}
        OR EXISTS (
          SELECT 1 FROM sample s
          JOIN layer l ON l.sample_id = s.sample_id
          LEFT JOIN layer_ingredient li ON li.layer_id = l.layer_id
          JOIN material m ON m.material_id IN (l.material_id, li.material_id)
          WHERE s.paper_id = p.paper_id AND m.name ILIKE $${index}
        ))`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    if (dto.source_type !== undefined) {
      query += ` AND p.source_type = $${index++}`;
      values.push(dto.source_type);
    }

    if (dto.status !== undefined) {
      query += ` AND p.status = $${index++}`;
      values.push(dto.status);
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY p.${dto.sort_by} ${order}`;
    } else {
      query += ` ORDER BY p.paper_id ASC`;
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
      const result: Paper[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching papers:', 'PaperService', error);
      throw new InternalServerErrorException('Error fetching papers');
    }
  }

  /**
   * Totals for the admin list: papers, samples and papers per status
   */
  async summary() {
    try {
      const [totals] = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM paper)::int AS papers,
          (SELECT COUNT(*) FROM sample)::int AS samples
      `);
      const statusRows: { status: string; count: number }[] = await this
        .dataSource.query(`
          SELECT ${PAPER_STATUS_SQL} AS status, COUNT(*)::int AS count
          FROM paper p
          GROUP BY 1
        `);

      const by_status = { draft: 0, review: 0, published: 0 };
      for (const row of statusRows) {
        if (row.status in by_status) {
          by_status[row.status as keyof typeof by_status] = row.count;
        }
      }

      return {
        success: true,
        data: { papers: totals.papers, samples: totals.samples, by_status },
      };
    } catch (error: unknown) {
      this.logger.error('Error fetching paper summary:', 'PaperService', error);
      throw new InternalServerErrorException('Error fetching paper summary');
    }
  }

  /**
   * Get paper by ID
   */
  async findById(id: string) {
    const paper = await this.paperRepo.findOne({
      where: { paper_id: id },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    return { success: true, data: paper };
  }

  /**
   * Create a new paper
   */
  async create(dto: CreatePaperDto, userId?: string) {
    try {
      const newPaper = this.paperRepo.create({
        doi: dto.doi ? canonicalDoi(dto.doi) : null,
        journal: dto.journal ?? null,
        year: dto.year ?? null,
        title: dto.title ?? null,
        source: dto.source,
        created_by: dto.created_by ?? userId ?? null,
      });

      const savedPaper = await this.paperRepo.save(newPaper);

      this.logger.debug('Paper created', 'PaperService', {
        paper_id: savedPaper.paper_id,
      });

      return {
        success: true,
        data: savedPaper,
        message: 'Paper created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Paper', 'create');
      if (httpError) throw httpError;
      this.logger.error('Error creating paper:', 'PaperService', error);
      throw new InternalServerErrorException('Error creating paper');
    }
  }

  /**
   * Update an existing paper
   */
  async update(id: string, dto: UpdatePaperDto) {
    // Check if paper exists
    const existingPaper = await this.paperRepo.findOne({
      where: { paper_id: id },
    });

    if (!existingPaper) {
      throw new NotFoundException('Paper not found');
    }

    // Build update object dynamically
    const updates: Partial<Paper> = {};

    if (dto.doi !== undefined)
      updates.doi = dto.doi ? canonicalDoi(dto.doi) : null;
    if (dto.journal !== undefined) updates.journal = dto.journal;
    if (dto.year !== undefined) updates.year = dto.year;
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.source !== undefined) updates.source = dto.source;
    if (dto.created_by !== undefined) updates.created_by = dto.created_by;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update!');
    }

    try {
      await this.paperRepo.update({ paper_id: id }, updates);

      const updatedPaper = await this.paperRepo.findOne({
        where: { paper_id: id },
      });

      this.logger.debug('Paper updated', 'PaperService', { paper_id: id });

      return {
        success: true,
        data: updatedPaper,
        message: 'Paper updated successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Paper', 'update');
      if (httpError) throw httpError;
      this.logger.error('Error updating paper:', 'PaperService', error);
      throw new InternalServerErrorException('Error updating paper');
    }
  }

  /**
   * Delete a paper by ID
   */
  async delete(id: string) {
    // Check if paper exists
    const existingPaper = await this.paperRepo.findOne({
      where: { paper_id: id },
    });

    if (!existingPaper) {
      throw new NotFoundException('Paper not found');
    }

    try {
      await this.paperRepo.delete({ paper_id: id });

      this.logger.debug('Paper deleted', 'PaperService', { paper_id: id });

      return {
        success: true,
        data: existingPaper,
        message: 'Paper deleted successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Paper', 'delete');
      if (httpError) throw httpError;
      this.logger.error('Error deleting paper:', 'PaperService', error);
      throw new InternalServerErrorException('Error deleting paper');
    }
  }
}
