import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CommandeTable } from './commande-table.entity';
import { Recette } from '../../recette/entities/recette.entity';

@Entity('t_lignes_commande_table')
export class LigneCommandeTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'integer', default: 1 })
  quantite: number;

  @Column({ name: 'r_prix_unitaire', type: 'real' })
  prix_unitaire: number;

  @Column({ name: 'r_note', type: 'character varying', length: 255, nullable: true })
  note: string | null;

  @ManyToOne(() => Recette, { eager: true, nullable: false })
  recette: Recette;

  @ManyToOne(() => CommandeTable, (c) => c.lignes, { eager: false, nullable: false, onDelete: 'CASCADE' })
  commande: CommandeTable;
}
