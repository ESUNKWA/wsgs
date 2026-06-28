import { Produit } from 'src/config/produit/entities/produit.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CommandeClient } from './commande-client.entity';

@Entity('t_detail_commandes_client')
export class DetailCommandeClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'r_quantite', type: 'integer', nullable: false })
  quantite: number;

  @Column({ name: 'r_prix_unitaire', type: 'real', nullable: false })
  prix_unitaire: number;

  @ManyToOne(() => Produit, { eager: true })
  produit: Produit;

  @ManyToOne(() => CommandeClient, (c) => c.detail_commande, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  commande: CommandeClient;
}
