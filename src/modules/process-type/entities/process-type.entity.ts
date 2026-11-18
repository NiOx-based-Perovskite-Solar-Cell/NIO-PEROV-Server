// process-type.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('process_type')
export class ProcessType {
  @PrimaryGeneratedColumn({ type: 'integer' })
  process_type_id!: number;

  @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'param_template', type: 'jsonb', default: {} })
  param_template?: Record<string, any>;
}
