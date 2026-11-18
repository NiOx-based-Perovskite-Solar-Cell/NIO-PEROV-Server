// user-sys.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('user_sys')
export class UserSys {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  user_sys_id!: string;

  @Column({ name: 'email', type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  first_name?: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  last_name?: string | null;

  @Column({ name: 'role_id', type: 'integer' })
  role_id!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'flag_valid', default: true })
  flag_valid?: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at?: Date;
}
