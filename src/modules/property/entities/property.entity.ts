// property.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('property')
export class Property {
  @PrimaryGeneratedColumn({ type: 'integer' })
  property_id!: number;

  @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit?: string | null;

  @Column({ name: 'valid_min', type: 'numeric', nullable: true })
  valid_min?: number | null;

  @Column({ name: 'valid_max', type: 'numeric', nullable: true })
  valid_max?: number | null;
}
