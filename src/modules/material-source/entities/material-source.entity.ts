// material-source.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('material_source')
export class MaterialSource {
  @PrimaryGeneratedColumn({ type: 'integer' })
  source_id!: number;

  @Column({ name: 'material_id', type: 'integer' })
  material_id!: number;

  @Column({ name: 'vendor_id', type: 'integer', nullable: true })
  vendor_id?: number | null;

  @Column({ name: 'purity_pct', type: 'numeric', nullable: true })
  purity_pct?: number | null;

  @Column({ name: 'grade', type: 'varchar', length: 100, nullable: true })
  grade?: string | null;
}
