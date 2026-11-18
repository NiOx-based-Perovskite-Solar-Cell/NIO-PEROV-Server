// user-identity.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserSys } from './user-sys.entity';

@Entity('user_identity')
export class UserIdentity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  identity_id!: string;

  @Column({ name: 'user_sys_id', type: 'bigint' })
  user_sys_id!: string;

  @ManyToOne(() => UserSys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_sys_id' })
  user?: UserSys;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true })
  email?: string | null;

  // e.g. 'google'
  @Column({ name: 'provider', type: 'varchar', length: 50 })
  provider!: string;

  // Google: the `sub` claim (stable account id, unlike email)
  @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
  provider_user_id!: string;

  @Column({ name: 'role_id', type: 'integer', nullable: true })
  role_id?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at?: Date;
}
