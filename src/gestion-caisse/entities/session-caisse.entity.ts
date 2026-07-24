import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MouvementCaisse } from './mouvement-caisse.entity';
import { Caisse } from './caisse.entity';

export type StatutSession = 'ouverte' | 'fermee';

export type FondParMode = Partial<Record<
  'espece' | 'mobile_money' | 'orange_money' | 'wave' | 'mtn_money' | 'moov_money' | 'dajmo' | 'carte' | 'credit' | 'mixte',
  number
>>;

@Entity('t_sessions_caisse')
export class SessionCaisse extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'r_reference', type: 'character varying', length: 20 })
  reference!: string;

  @Column({ name: 'r_fond_ouverture', type: 'jsonb', default: '{}' })
  fond_ouverture!: FondParMode;

  @Column({ name: 'r_fond_fermeture', nullable: true, type: 'jsonb' })
  fond_fermeture!: FondParMode | null;

  @Column({ name: 'r_montant_theorique', nullable: true, type: 'jsonb' })
  montant_theorique!: FondParMode | null;

  @Column({ name: 'r_ecart', nullable: true, type: 'jsonb' })
  ecart!: FondParMode | null;

  @Column({ name: 'r_statut', type: 'character varying', length: 10, default: 'ouverte' })
  statut!: StatutSession;

  @Column({ name: 'r_date_ouverture', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_ouverture!: Date;

  @Column({ name: 'r_date_fermeture', nullable: true, type: 'timestamp' })
  date_fermeture!: Date | null;

  @Column({ name: 'r_notes', nullable: true, type: 'text' })
  notes!: string | null;

  @ManyToOne(() => Boutique, { eager: true, nullable: false })
  boutique!: Boutique;

  @ManyToOne(() => Utilisateur, { eager: true, nullable: false })
  caissier!: Utilisateur;

  @ManyToOne(() => Caisse, { nullable: true, eager: false })
  caisse!: Caisse | null;

  @OneToMany(() => MouvementCaisse, (m) => m.session)
  mouvements!: MouvementCaisse[];
}
