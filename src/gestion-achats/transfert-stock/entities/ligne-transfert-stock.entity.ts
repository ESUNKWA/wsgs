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

  // Traçabilité de la saisie d'origine (unité de détail ou carton/casier) — `quantite`
  // ci-dessus reste la source de vérité en unité de détail (comme pour l'achat).
  @Column({ name: 'r_mode_saisie', type: 'character varying', length: 10, nullable: true, default: 'unite' })
  mode_saisie: string | null;

  @Column({ name: 'r_quantite_colis', type: 'real', nullable: true })
  quantite_colis: number | null;
}
