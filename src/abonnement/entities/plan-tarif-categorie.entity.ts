import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { PlanType } from './plan-tarif.entity';

@Entity('plan_tarifs_categories')
@Unique(['plan', 'categorieId'])
export class PlanTarifCategorie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'plan', type: 'varchar', length: 10 })
  plan: PlanType;

  @Column({ name: 'categorie_id' })
  categorieId: number;

  @Column({ name: 'montant', type: 'real' })
  montant: number;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'est_actif', type: 'boolean', default: true })
  est_actif: boolean;
}
