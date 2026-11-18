// solvent-system-detail.service.ts
import {
  Injectable,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CreateSolventSystemDetailDto,
  ReplaceComponentsDto,
  SolventComponentItemDto,
} from './dto/solvent-system-detail.dto';
import { AppLogger } from '../../../common/logger/app-logger.service';
import { toPgHttpException } from '../../../common/utils/pg-error.util';
import { SolventSystem } from '../../solvent-system/entities/solvent-system.entity';
import { SolventComponent } from '../../solvent-component/entities/solvent-component.entity';

// fractions are rounded in papers (e.g. 0.33 + 0.67), allow a small slack
const FRACTION_SUM_TOLERANCE = 0.01;

/**
 * Solvent system + its components (with material names)
 */
@Injectable()
export class SolventSystemDetailService {
  constructor(
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get solvent system with components by ID
   */
  async findById(id: number) {
    const solventSystem = await this.dataSource.manager.findOne(SolventSystem, {
      where: { solvent_system_id: id },
    });

    if (!solventSystem) {
      throw new NotFoundException('Solvent system not found');
    }

    try {
      const components = await this.dataSource.query<Record<string, unknown>[]>(
        `
        SELECT sc.material_id, m.name AS material_name, m.formula, sc.fraction
        FROM solvent_component sc
        JOIN material m ON m.material_id = sc.material_id
        WHERE sc.solvent_system_id = $1
        ORDER BY sc.fraction DESC
        `,
        [id],
      );

      return { success: true, data: { ...solventSystem, components } };
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching solvent system detail:',
        'SolventSystemDetailService',
        error,
      );
      throw new InternalServerErrorException(
        'Error fetching solvent system detail',
      );
    }
  }

  /**
   * Create a solvent system with its components in one transaction
   */
  async create(dto: CreateSolventSystemDetailDto) {
    const { components, ...systemFields } = dto;
    this.validateComponents(components);

    let solventSystemId: number;

    try {
      solventSystemId = await this.dataSource.transaction(async (manager) => {
        const solventSystem = await manager.save(
          manager.create(SolventSystem, {
            ...systemFields,
            label: systemFields.label ?? null,
          }),
        );

        await manager.insert(
          SolventComponent,
          components.map((c) => ({
            ...c,
            solvent_system_id: solventSystem.solvent_system_id,
          })),
        );

        return solventSystem.solvent_system_id;
      });
    } catch (error: unknown) {
      const httpError = toPgHttpException(error, 'Solvent system', 'create');
      if (httpError) throw httpError;
      this.logger.error(
        'Error creating solvent system detail:',
        'SolventSystemDetailService',
        error,
      );
      throw new InternalServerErrorException('Error creating solvent system');
    }

    this.logger.debug(
      'Solvent system detail created',
      'SolventSystemDetailService',
      { solvent_system_id: solventSystemId, components: components.length },
    );

    const created = await this.findById(solventSystemId);
    return { ...created, message: 'Solvent system created successfully' };
  }

  /**
   * Replace all components of a solvent system (delete + insert in one transaction)
   */
  async replaceComponents(id: number, dto: ReplaceComponentsDto) {
    this.validateComponents(dto.components);

    try {
      await this.dataSource.transaction(async (manager) => {
        const solventSystem = await manager.findOne(SolventSystem, {
          where: { solvent_system_id: id },
        });

        if (!solventSystem) {
          throw new NotFoundException('Solvent system not found');
        }

        await manager.delete(SolventComponent, { solvent_system_id: id });
        await manager.insert(
          SolventComponent,
          dto.components.map((c) => ({ ...c, solvent_system_id: id })),
        );
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const httpError = toPgHttpException(error, 'Solvent component', 'update');
      if (httpError) throw httpError;
      this.logger.error(
        'Error replacing solvent components:',
        'SolventSystemDetailService',
        error,
      );
      throw new InternalServerErrorException(
        'Error replacing solvent components',
      );
    }

    this.logger.debug(
      'Solvent components replaced',
      'SolventSystemDetailService',
      { solvent_system_id: id, components: dto.components.length },
    );

    const updated = await this.findById(id);
    return { ...updated, message: 'Solvent components replaced successfully' };
  }

  /**
   * No duplicate solvent, fractions sum to 1
   */
  private validateComponents(components: SolventComponentItemDto[]) {
    const materialIds = components.map((c) => c.material_id);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('Duplicate material in components!');
    }

    const sum = components.reduce((acc, c) => acc + c.fraction, 0);
    if (Math.abs(sum - 1) > FRACTION_SUM_TOLERANCE) {
      throw new BadRequestException(
        `Component fractions must sum to 1 (got ${sum})`,
      );
    }
  }
}
