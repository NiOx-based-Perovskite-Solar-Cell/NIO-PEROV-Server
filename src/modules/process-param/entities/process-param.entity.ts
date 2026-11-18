// process-param.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('process_param')
export class ProcessParam {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  param_id!: string;

  @Column({ name: 'step_id', type: 'bigint' })
  step_id!: string;

  @Column({ name: 'param', type: 'varchar', length: 100 })
  param!: string;

  @Column({ name: 'value', type: 'numeric', nullable: true })
  value?: number | null;

  @Column({ name: 'value_min', type: 'numeric', nullable: true })
  value_min?: number | null;

  @Column({ name: 'value_max', type: 'numeric', nullable: true })
  value_max?: number | null;

  @Column({ name: 'qualifier', type: 'varchar', length: 1, default: '=' })
  qualifier?: string;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit?: string | null;
}
