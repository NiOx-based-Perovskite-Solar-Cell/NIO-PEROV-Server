// sample.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sample')
export class Sample {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  sample_id!: string;

  @Column({ name: 'paper_id', type: 'bigint' })
  paper_id!: string;

  @Column({ name: 'sample_no', type: 'smallint', nullable: true })
  sample_no?: number | null;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: true })
  label?: string | null;

  @Column({ name: 'architecture', type: 'varchar', length: 3, nullable: true })
  architecture?: string | null;

  @Column({ name: 'is_control', type: 'boolean', default: false })
  is_control?: boolean;

  @Column({ name: 'submission_id', type: 'bigint', nullable: true })
  submission_id?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at?: Date;
}
