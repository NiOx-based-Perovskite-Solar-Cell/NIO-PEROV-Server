// process-step.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('process_step')
export class ProcessStep {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  step_id!: string;

  @Column({ name: 'layer_id', type: 'bigint' })
  layer_id!: string;

  @Column({ name: 'step_order', type: 'smallint' })
  step_order!: number;

  @Column({ name: 'process_type_id', type: 'integer', nullable: true })
  process_type_id?: number | null;

  @Column({ name: 'scope', type: 'varchar', length: 50, nullable: true })
  scope?: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;
}
