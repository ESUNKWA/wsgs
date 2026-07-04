import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanAbonnement = 'essai' | '3_mois' | '6_mois' | '1_an';
export type StatutAbonnement = 'actif' | 'expire' | 'suspendu';

@Entity('abonnements')
export class Abonnement extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structure_id' })
  structureId: number;

  @Column({ name: 'plan', type: 'varchar', length: 10 })
  plan: PlanAbonnement;

  @Column({ name: 'date_debut', type: 'timestamp' })
  date_debut: Date;

  @Column({ name: 'date_fin', type: 'timestamp' })
  date_fin: Date;

  @Column({ name: 'statut', type: 'varchar', length: 10, default: 'actif' })
  statut: StatutAbonnement;

  @Column({ name: 'montant', type: 'real', default: 0 })
  montant: number;

  @Column({ name: 'devise', type: 'varchar', length: 5, default: 'XOF' })
  devise: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
