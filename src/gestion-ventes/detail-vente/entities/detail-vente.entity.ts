import { Produit } from "src/config/produit/entities/produit.entity";
import { Vente } from "src/gestion-ventes/vente/entities/vente.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_detail_ventes')
export class DetailVente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'r_quantite', type: 'integer', nullable: false})
    quantite: number;

    @Column({name: 'r_prix_unitaire_vente', type: 'real', nullable: false})
    prix_unitaire_vente: number;

    @ManyToOne(type=> Produit, (produit) => produit.detail_achat, {eager: true})
    produit: Produit;

    @ManyToOne(type=> Vente, (vente) => vente.detail_vente, {eager: false, nullable: false})
    @JoinColumn({ name: 'venteId' })
    vente: Vente;
}
