import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LigneCommandeTable } from './ligne-commande-table.entity';
import { TableRestaurant } from '../../table/entities/table.entity';

export type StatutCommandeTable = 'en_attente' | 'en_cours' | 'prete' | 'servie' | 'payee' | 'annulee';

@Entity('t_commandes_table')
export class CommandeTable extends defaultDateGeneratorHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'r_reference', type: 'character varying', length: 30, unique: true })
  reference: string;

  @Column({
    name: 'r_statut',
    type: 'enum',
    enum: ['en_attente', 'en_cours', 'prete', 'servie', 'payee', 'annulee'],
    default: 'en_cours',
  })
  statut: StatutCommandeTable;

  @Column({ name: 'r_montant_total', type: 'real', default: 0 })
  montant_total: number;

  @Column({ name: 'r_notes', type: 'text', nullable: true })
  notes: string | null;

  /** Numéro de téléphone du client (commande passée via QR) */
  @Column({ name: 'r_telephone', type: 'character varying', length: 30, nullable: true })
  telephone: string | null;

  /** 'staff' = saisie par le personnel | 'client' = passée via QR code */
  @Column({ name: 'r_source', type: 'character varying', length: 10, default: 'staff' })
  source: 'staff' | 'client';

  /** Numéro de passage du jour (1, 2, 3…) remis à zéro chaque jour par boutique */
  @Column({ name: 'r_numero_ordre', type: 'integer', nullable: true })
  numero_ordre: number | null;

  @ManyToOne(() => TableRestaurant, { eager: true, nullable: true })
  table: TableRestaurant;

  @ManyToOne(() => Boutique, { eager: false, nullable: false })
  boutique: Boutique;

  @ManyToOne(() => Utilisateur, { eager: false, nullable: true })
  user: Utilisateur;

  @OneToMany(() => LigneCommandeTable, (l) => l.commande, { cascade: true })
  lignes: LigneCommandeTable[];
}
