import { Fournisseur } from "src/config/fournisseur/entities/fournisseur.entity";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { GenerateDate } from "src/module/generateDate";
import { Column, Entity, Index, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export type ModePaiement = "espece" | "espece" | "carte"| "mobile_money";

@Entity('t_achats')
export class Achat extends GenerateDate {

    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_reference', type: 'character varying', length: 10})
    reference: string;

    @Column({name: 'r_montant_total', nullable: false, type: 'real'})
    montant_total: number;

    @Column({name: 'r_date_achat', nullable: true, type: 'timestamp'})
    date_achat: Date;

    @Column({
        type: "enum",
        enum: ["espece", "carte", "mobile_money"],
        default: "espece"}
    )
    mode_paiement: ModePaiement;

    @Column({name: 'r_statut', nullable: true, type: 'character varying', length: 10})
    statut: string;


    @ManyToOne(
        type => Fournisseur,
        (fournisseur) => fournisseur.achat,
        {eager: true}
    )
    fournisseur: Fournisseur

    @OneToMany(
        type => DetailAchat,
        (detail_achat) => detail_achat.produit,
        {onDelete: 'CASCADE'}
    )
    detail_achat: DetailAchat[];
}
