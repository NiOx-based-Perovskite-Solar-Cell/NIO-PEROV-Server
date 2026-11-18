// solvent-component.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SolventComponent } from './entities/solvent-component.entity';
import {
  SearchSolventComponentDto,
  CreateSolventComponentDto,
  UpdateSolventComponentDto,
} from './dto/solvent-component.dto';
import { AppLogger } from '../../common/logger/app-logger.service';
import { toPgHttpException } from '../../common/utils/pg-error.util';

interface SolventComponentKey {
  solvent_system_id: number;
  material_id: number;
}

@Injectable()
export class SolventComponentService {
  constructor(
    @InjectRepository(SolventComponent)
    private solventComponentRepo: Repository<SolventComponent>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search solvent components with filters and pagination (no filter = get all)
   */
  async search(dto: SearchSolventComponentDto) {
    let query = `
      SELECT sc.*, m.name AS material_name, ss.label AS solvent_system_label,
        COUNT(*) OVER() as total_count
      FROM solvent_component sc
      LEFT JOIN material m ON m.material_id = sc.material_id
      LEFT JOIN solvent_system ss ON ss.solvent_system_id = sc.solvent_system_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.solvent_system_id !== undefined) {
      query += ` AND sc.solvent_system_id = $${index++}`;
      values.push(dto.solvent_system_id);
    }

    if (dto.material_id !== undefined) {
      query += ` AND sc.material_id = $${index++}`;
      values.push(dto.material_id);
    }

    query += ` ORDER BY sc.solvent_system_id, sc.fraction DESC`;

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
      const result: SolventComponent[] = await this.dataSource.query(
        query,
        values,
      );
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error(
        'Error searching solvent components:',
        'SolventComponentService',
        error,
      );
      throw new InternalServerErrorException(
        'Error fetching solvent components',
      );
    }
  }

  /**
   * Get every component of a solvent system
   */
  async findBySolventSystemId(solventSystemId: number) {
    const rows = await this.solventComponentRepo.find({
      where: { solvent_system_id: solventSystemId },
      order: { fraction: 'DESC' },
    });

    return { success: true, data: rows };
  }

  /**
   * Create a new solvent component
   */
  async create(dto: CreateSolventComponentDto) {
    if (
      dto.solvent_system_id === undefined ||
      dto.material_id === undefined ||
      dto.fraction === undefined
    ) {
      throw new BadRequestException('Missing required fields!');
    }

    try {
      const newComponent = this.solventComponentRepo.create({
        solvent_system_id: dto.solvent_system_id,
        material_id: dto.material_id,
        fraction: dto.fraction,
      });

      // insert (not save) so an existing key is a 409, not a silent overwrite
      await this.solventComponentRepo.insert(newComponent);

      this.logger.debug(
        'Solvent component created',
        'SolventComponentService',
        {
          solvent_system_id: dto.solvent_system_id,
          material_id: dto.material_id,
        },
      );

      return {
        success: true,
        data: newComponent,
        message: 'Solvent component created successfully',
      };
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Solvent component', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating solvent component:',
        'SolventComponentService',
        error,
      );
      throw new InternalServerErrorException(
        'Error creating solvent component',
      );
    }
  }

  /**
   * Update the fraction of a solvent component
   */
  async update(key: SolventComponentKey, dto: UpdateSolventComponentDto) {
    const existingComponent = await this.solventComponentRepo.findOne({
      where: key,
    });

    if (!existingComponent) {
      throw new NotFoundException('Solvent component not found');
    }

    try {
      await this.solventComponentRepo.update(key, { fraction: dto.fraction });

      const updatedComponent = await this.solventComponentRepo.findOne({
        where: key,
      });

      this.logger.debug(
        'Solvent component updated',
        'SolventComponentService',
        key,
      );

      return {
        success: true,
        data: updatedComponent,
        message: 'Solvent component updated successfully',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error updating solvent component:',
        'SolventComponentService',
        error,
      );
      throw new InternalServerErrorException(
        'Error updating solvent component',
      );
    }
  }

  /**
   * Delete a solvent component
   */
  async delete(key: SolventComponentKey) {
    const existingComponent = await this.solventComponentRepo.findOne({
      where: key,
    });

    if (!existingComponent) {
      throw new NotFoundException('Solvent component not found');
    }

    try {
      await this.solventComponentRepo.delete(key);

      this.logger.debug(
        'Solvent component deleted',
        'SolventComponentService',
        key,
      );

      return {
        success: true,
        data: existingComponent,
        message: 'Solvent component deleted successfully',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Error deleting solvent component:',
        'SolventComponentService',
        error,
      );
      throw new InternalServerErrorException(
        'Error deleting solvent component',
      );
    }
  }
}
