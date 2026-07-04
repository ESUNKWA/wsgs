import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanType = '3_mois' | '6_mois' | '1_an';

@Entity('plan_tarifs')
export class PlanTarif {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'plan', type: 'varchar', length: 10, unique: true })
  plan: PlanType;

  @Column({ name: 'montant', type: 'real' })
  montant: number;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'est_actif', type: 'boolean', default: true })
  est_actif: boolean;
}
