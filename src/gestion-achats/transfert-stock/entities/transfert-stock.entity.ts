import { defaultDateGeneratorHelper } from 'src/common/helpers/default-date-genarate';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LigneTransfertStock } from './ligne-transfert-stock.entity';

export type StatutTransfert = 'brouillon' | 'valide' | 'recu';

@Entity('t_transferts_stock')
export class TransfertStock extends defaultDateGeneratorHelper {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_reference', type: 'varchar', length: 30, unique: true })
  reference: string;

  @Column({ name: 'r_statut', type: 'varchar', length: 20, default: 'brouillon' })
  statut: StatutTransfert;

  @ManyToOne(() => Boutique, { eager: true, nullable: false })
  boutique_source: Boutique;

  @ManyToOne(() => Boutique, { eager: true, nullable: false })
  boutique_destination: Boutique;

  @Column({ name: 'r_notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'r_date_envoi', type: 'timestamp', nullable: true })
  date_envoi: Date | null;

  @Column({ name: 'r_date_reception', type: 'timestamp', nullable: true })
  date_reception: Date | null;

  @ManyToOne(() => Utilisateur, { eager: true, nullable: true })
  utilisateur: Utilisateur | null;

  @OneToMany(() => LigneTransfertStock, (l) => l.transfert, { cascade: true })
  lignes: LigneTransfertStock[];
}
