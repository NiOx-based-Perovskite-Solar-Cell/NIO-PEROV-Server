// material.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('material')
export class Material {
  @PrimaryGeneratedColumn({ type: 'integer' })
  material_id!: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'form', type: 'varchar', length: 100, nullable: true })
  form?: string | null;

  @Column({ name: 'formula', type: 'varchar', length: 255, nullable: true })
  formula?: string | null;

  @Column({ name: 'is_perovskite', type: 'boolean', default: false })
  is_perovskite?: boolean;
}
