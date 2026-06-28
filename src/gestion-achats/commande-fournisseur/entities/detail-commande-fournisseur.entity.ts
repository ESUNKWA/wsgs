import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CommandeFournisseur } from './commande-fournisseur.entity';

@Entity('t_detail_commandes_fournisseur')
export class DetailCommandeFournisseur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'integer', nullable: false })
  quantite: number;

  @Column({ name: 'r_quantite_recue', type: 'integer', default: 0 })
  quantite_recue: number;

  @Column({ name: 'r_prix_unitaire', type: 'real', nullable: false })
  prix_unitaire: number;

  @ManyToOne(() => Produit, { eager: true })
  produit: Produit;

  @ManyToOne(() => CommandeFournisseur, (c) => c.detail_commande, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  commande: CommandeFournisseur;
}
