import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_detail_achats')
export class DetailAchat extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'r_quantite', type: 'integer', nullable: false})
    quantite: number;

    @Column({name: 'r_prix_unitaire', type: 'real', nullable: false})
    prix_unitaire: number;

    @ManyToOne(type=> Produit, (produit) => produit.detail_achat, {eager: true})
    produit: Produit;

    @ManyToOne(type=> Achat, (achat) => achat.detail_achat, {eager: true, nullable: false})
    @JoinColumn({ name: 'achatId' })
    achat: Achat;
}
