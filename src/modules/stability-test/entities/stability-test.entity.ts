// stability-test.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stability_test')
export class StabilityTest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  test_id!: string;

  @Column({ name: 'sample_id', type: 'bigint' })
  sample_id!: string;

  @Column({ name: 'atmosphere', type: 'varchar', length: 100, nullable: true })
  atmosphere?: string | null;

  @Column({ name: 'light', type: 'varchar', length: 100, nullable: true })
  light?: string | null;

  @Column({ name: 'mode', type: 'varchar', length: 100, nullable: true })
  mode?: string | null;

  @Column({ name: 'isos_code', type: 'varchar', length: 30, nullable: true })
  isos_code?: string | null;

  @Column({ name: 'encapsulated', type: 'boolean', nullable: true })
  encapsulated?: boolean | null;

  @Column({ name: 'temperature_c', type: 'numeric', nullable: true })
  temperature_c?: number | null;

  @Column({ name: 'rh_pct', type: 'numeric', nullable: true })
  rh_pct?: number | null;

  @Column({ name: 'rh_min_pct', type: 'numeric', nullable: true })
  rh_min_pct?: number | null;

  @Column({ name: 'rh_max_pct', type: 'numeric', nullable: true })
  rh_max_pct?: number | null;

  @Column({ name: 'duration_h', type: 'numeric', nullable: true })
  duration_h?: number | null;

  @Column({ name: 'retention_pct', type: 'numeric', nullable: true })
  retention_pct?: number | null;

  @Column({ name: 't80_h', type: 'numeric', nullable: true })
  t80_h?: number | null;
}
