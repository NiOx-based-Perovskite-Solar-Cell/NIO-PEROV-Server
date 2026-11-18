// solvent-system.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('solvent_system')
export class SolventSystem {
  @PrimaryGeneratedColumn({ type: 'integer' })
  solvent_system_id!: number;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: true })
  label?: string | null;

  @Column({ name: 'basis', type: 'varchar', length: 3, default: 'v/v' })
  basis?: string;
}
