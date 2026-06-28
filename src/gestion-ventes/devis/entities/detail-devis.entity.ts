import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Devis } from './devis.entity';

@Entity('t_detail_devis')
export class DetailDevis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'integer', nullable: false })
  quantite: number;

  @Column({ name: 'r_prix_unitaire', type: 'real', nullable: false })
  prix_unitaire: number;

  @ManyToOne(() => Produit, { eager: true })
  produit: Produit;

  @ManyToOne(() => Devis, (d) => d.detail_devis, { eager: false, nullable: false, onDelete: 'CASCADE' })
  devis: Devis;
}
