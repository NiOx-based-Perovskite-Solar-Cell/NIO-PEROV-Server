// layer.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('layer')
export class Layer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  layer_id!: string;

  @Column({ name: 'sample_id', type: 'bigint' })
  sample_id!: string;

  @Column({ name: 'position', type: 'smallint' })
  position!: number;

  @Column({ name: 'sub_order', type: 'smallint', default: 0 })
  sub_order?: number;

  @Column({ name: 'role', type: 'varchar', length: 50, nullable: true })
  role?: string | null;

  @Column({ name: 'material_id', type: 'integer', nullable: true })
  material_id?: number | null;

  @Column({ name: 'thickness_nm', type: 'smallint', nullable: true })
  thickness_nm?: number | null;

  @Column({ name: 'thickness_min_nm', type: 'smallint', nullable: true })
  thickness_min_nm?: number | null;

  @Column({ name: 'thickness_max_nm', type: 'smallint', nullable: true })
  thickness_max_nm?: number | null;
}
