// measurement.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('measurement')
export class Measurement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  measurement_id!: string;

  @Column({ name: 'sample_id', type: 'bigint' })
  sample_id!: string;

  @Column({ name: 'property_id', type: 'integer' })
  property_id!: number;

  @Column({ name: 'statistic', type: 'varchar', length: 30, nullable: true })
  statistic?: string | null;

  @Column({ name: 'scan', type: 'varchar', length: 2, default: 'NA' })
  scan?: string;

  @Column({ name: 'value', type: 'numeric', nullable: true })
  value?: number | null;

  @Column({ name: 'error', type: 'numeric', nullable: true })
  error?: number | null;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit?: string | null;
}
