import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TransfertStock } from './transfert-stock.entity';

@Entity('t_lignes_transfert_stock')
export class LigneTransfertStock {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TransfertStock, (t) => t.lignes, { onDelete: 'CASCADE' })
  transfert: TransfertStock;

  @ManyToOne(() => Produit, { eager: true, nullable: false })
  produit: Produit;

  @Column({ name: 'r_quantite', type: 'real', nullable: false })
  quantite: number;
}
