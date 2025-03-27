import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_detail_achats')
export class DetailAchat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'r_quantite', type: 'integer', nullable: false})
    quantite: number;

    @Column({name: 'r_prix_achat', type: 'real', nullable: false})
    prix_achat: number;

    @ManyToOne(type=> Produit, (produit) => produit.detail_achat, {eager: true})
    produit: Produit;

    @ManyToOne(type=> Achat, (achat) => achat.detail_achat, {eager: true})
    achat: Achat;
}
