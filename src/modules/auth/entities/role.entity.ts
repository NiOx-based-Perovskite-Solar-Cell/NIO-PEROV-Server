// role.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import type { AccessControl } from '../../../common/interface/access.interface';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn({ type: 'integer' })
  role_id!: number;

  @Column({ name: 'role_name', type: 'varchar', length: 200, unique: true })
  role_name!: string;

  @Column({ name: 'access', type: 'json', default: {} })
  access!: AccessControl;

  @Column({ name: 'flag_valid', default: true })
  flag_valid?: boolean;
}
