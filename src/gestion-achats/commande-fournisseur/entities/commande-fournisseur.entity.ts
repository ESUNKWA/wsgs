import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Fournisseur } from 'src/config/fournisseur/entities/fournisseur.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DetailCommandeFournisseur } from './detail-commande-fournisseur.entity';

export type StatutCommandeFournisseur = 'brouillon' | 'envoye' | 'recu_partiel' | 'recu_total' | 'annule';

@Entity('t_commandes_fournisseur')
export class CommandeFournisseur extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'r_reference', type: 'character varying', length: 30, unique: true })
  reference: string;

  @Column({
    name: 'r_statut',
    type: 'enum',
    enum: ['brouillon', 'envoye', 'recu_partiel', 'recu_total', 'annule'],
    default: 'brouillon',
  })
  statut: StatutCommandeFournisseur;

  @Column({ name: 'r_date_livraison_prevue', nullable: true, type: 'timestamp' })
  date_livraison_prevue: Date;

  @Column({ name: 'r_montant_total', type: 'real', default: 0 })
  montant_total: number;

  @Column({ name: 'r_notes', type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Fournisseur, { eager: true, nullable: true })
  fournisseur: Fournisseur;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  @ManyToOne(() => Utilisateur, { eager: false, nullable: true })
  user: Utilisateur;

  @OneToMany(() => DetailCommandeFournisseur, (d) => d.commande, { cascade: true })
  detail_commande: DetailCommandeFournisseur[];
}
