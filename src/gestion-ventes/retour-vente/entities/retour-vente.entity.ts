import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DetailRetourVente } from './detail-retour-vente.entity';

export type StatutRetour = 'en_attente' | 'valide' | 'annule';

@Entity('t_retours_vente')
export class RetourVente extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'r_reference', type: 'character varying', length: 25, unique: true })
  reference!: string;

  @ManyToOne(() => Vente, { eager: false, nullable: false })
  vente!: Vente;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique!: Boutique;

  @ManyToOne(() => Utilisateur, { eager: false, nullable: true })
  user!: Utilisateur | null;

  @Column({ name: 'r_motif', type: 'text', nullable: true })
  motif!: string | null;

  @Column({ name: 'r_montant_total_rembourse', type: 'real', default: 0 })
  montant_total_rembourse!: number;

  @Column({
    name: 'r_statut',
    type: 'enum',
    enum: ['en_attente', 'valide', 'annule'],
    default: 'valide',
  })
  statut!: StatutRetour;

  @OneToMany(() => DetailRetourVente, (d) => d.retour, { onDelete: 'CASCADE' })
  details!: DetailRetourVente[];
}
