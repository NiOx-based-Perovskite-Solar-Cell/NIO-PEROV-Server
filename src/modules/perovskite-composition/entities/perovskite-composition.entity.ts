// perovskite-composition.entity.ts
import { Entity, Column, PrimaryColumn } from 'typeorm';

// one row per ion on a site, PK = (material_id, site, ion)
@Entity('perovskite_composition')
export class PerovskiteComposition {
  @PrimaryColumn({ name: 'material_id', type: 'integer' })
  material_id!: number;

  @PrimaryColumn({ name: 'site', type: 'varchar', length: 1 })
  site!: string;

  @PrimaryColumn({ name: 'ion', type: 'varchar', length: 50 })
  ion!: string;

  @Column({ name: 'fraction', type: 'numeric' })
  fraction!: number;
}
