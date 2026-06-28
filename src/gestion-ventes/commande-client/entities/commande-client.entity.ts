import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Client } from 'src/gestion-ventes/client/entities/client.entity';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DetailCommandeClient } from './detail-commande-client.entity';

export type StatutCommandeClient =
  | 'en_attente'
  | 'confirme'
  | 'en_preparation'
  | 'expedie'
  | 'livre'
  | 'annule';

@Entity('t_commandes_client')
export class CommandeClient extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'r_reference', type: 'character varying', length: 30, unique: true })
  reference: string;

  @Column({
    name: 'r_statut',
    type: 'enum',
    enum: ['en_attente', 'confirme', 'en_preparation', 'expedie', 'livre', 'annule'],
    default: 'en_attente',
  })
  statut: StatutCommandeClient;

  @Column({ name: 'r_date_livraison_prevue', nullable: true, type: 'timestamp' })
  date_livraison_prevue: Date;

  @Column({ name: 'r_montant_total', type: 'real', default: 0 })
  montant_total: number;

  @Column({ name: 'r_remise', nullable: true, type: 'real', default: 0 })
  remise: number;

  @Column({ name: 'r_montant_total_apres_remise', nullable: true, type: 'real', default: 0 })
  montant_total_apres_remise: number;

  @Column({ name: 'r_notes', type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Client, { eager: true, nullable: true })
  client: Client;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  @ManyToOne(() => Utilisateur, { eager: false, nullable: true })
  user: Utilisateur;

  @OneToMany(() => DetailCommandeClient, (d) => d.commande, { cascade: true })
  detail_commande: DetailCommandeClient[];
}
