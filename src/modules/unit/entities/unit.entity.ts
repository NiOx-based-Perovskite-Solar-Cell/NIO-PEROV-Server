// unit.entity.ts
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('unit')
export class Unit {
  @PrimaryColumn({ name: 'unit_code', type: 'varchar', length: 30 })
  unit_code!: string;

  @Column({ name: 'quantity', type: 'varchar', length: 100 })
  quantity!: string;

  @Column({ name: 'to_si_factor', type: 'numeric', default: 1 })
  to_si_factor?: number;

  @Column({ name: 'to_si_offset', type: 'numeric', default: 0 })
  to_si_offset?: number;
}
