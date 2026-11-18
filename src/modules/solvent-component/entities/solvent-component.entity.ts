// solvent-component.entity.ts
import { Entity, Column, PrimaryColumn } from 'typeorm';

// one row per solvent in a solvent system, PK = (solvent_system_id, material_id)
@Entity('solvent_component')
export class SolventComponent {
  @PrimaryColumn({ name: 'solvent_system_id', type: 'integer' })
  solvent_system_id!: number;

  @PrimaryColumn({ name: 'material_id', type: 'integer' })
  material_id!: number;

  @Column({ name: 'fraction', type: 'numeric' })
  fraction!: number;
}
