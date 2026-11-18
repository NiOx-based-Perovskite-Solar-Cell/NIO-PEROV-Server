// vendor.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('vendor')
export class Vendor {
  @PrimaryGeneratedColumn({ type: 'integer' })
  vendor_id!: number;

  @Column({ name: 'name', type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ name: 'country', type: 'varchar', length: 100, nullable: true })
  country?: string | null;
}
