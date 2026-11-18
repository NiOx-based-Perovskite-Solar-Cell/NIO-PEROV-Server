// layer-ingredient.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('layer_ingredient')
export class LayerIngredient {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  ingredient_id!: string;

  @Column({ name: 'layer_id', type: 'bigint' })
  layer_id!: string;

  @Column({ name: 'material_id', type: 'integer', nullable: true })
  material_id?: number | null;

  @Column({ name: 'role', type: 'varchar', length: 50, nullable: true })
  role?: string | null;

  @Column({ name: 'solvent_system_id', type: 'integer', nullable: true })
  solvent_system_id?: number | null;

  @Column({ name: 'amount', type: 'numeric', nullable: true })
  amount?: number | null;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit?: string | null;
}
