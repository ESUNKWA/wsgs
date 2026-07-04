import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RetourVente } from './retour-vente.entity';

@Entity('t_details_retour_vente')
export class DetailRetourVente {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => RetourVente, (r) => r.details, { eager: false, nullable: false })
  retour!: RetourVente;

  @ManyToOne(() => Produit, { eager: true, nullable: false })
  produit!: Produit;

  @Column({ name: 'r_quantite_retournee', type: 'integer', nullable: false })
  quantite_retournee!: number;

  @Column({ name: 'r_prix_unitaire_vente', type: 'real', nullable: false })
  prix_unitaire_vente!: number;

  @Column({ name: 'r_montant', type: 'real', nullable: false })
  montant!: number;
}
