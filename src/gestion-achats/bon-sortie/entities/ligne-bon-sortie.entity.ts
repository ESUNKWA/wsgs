import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BonSortie } from './bon-sortie.entity';

@Entity('t_lignes_bon_sortie')
export class LigneBonSortie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'real', nullable: false })
  quantite: number;

  @ManyToOne(() => BonSortie, (b) => b.lignes, { onDelete: 'CASCADE' })
  bonSortie: BonSortie;

  @ManyToOne(() => Produit, { eager: true, nullable: false })
  fourniture: Produit;
}
