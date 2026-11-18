// paper.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('paper')
export class Paper {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  paper_id!: string;

  @Column({
    name: 'doi',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
  })
  doi?: string | null;

  @Column({ name: 'journal', type: 'varchar', length: 255, nullable: true })
  journal?: string | null;

  @Column({ name: 'year', type: 'smallint', nullable: true })
  year?: number | null;

  @Column({ name: 'title', type: 'text', nullable: true })
  title?: string | null;

  @Column({ name: 'source', type: 'text', array: true, default: () => "'{}'" })
  source?: string[];

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  created_by?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at?: Date;
}
