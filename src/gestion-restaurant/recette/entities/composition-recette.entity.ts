import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Recette } from './recette.entity';

@Entity('t_compositions_recettes')
export class CompositionRecette {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'real', default: 1 })
  quantite: number;

  @ManyToOne(() => Recette, (r) => r.compositions, { eager: false, nullable: false, onDelete: 'CASCADE' })
  recette: Recette;

  @ManyToOne(() => Produit, { eager: true, nullable: false })
  produit: Produit;
}
