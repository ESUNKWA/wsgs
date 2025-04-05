import { Fournisseur } from "src/config/fournisseur/entities/fournisseur.entity";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { HistoriqueStock } from "src/gestion-achats/historique-stock/entities/historique-stock.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";

export type ModePaiement = "espece" | "carte"| "mobile_money";

@Entity('t_achats')
export class Achat extends defaultDateGeneratorHelper {

    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_reference', type: 'character varying', length: 20, unique: true})
    reference: string;

    @Column({name: 'r_montant_total', nullable: false, type: 'real'})
    montant_total: number;

    @Column({name: 'r_date_achat', nullable: true, type: 'timestamp'})
    date_achat: Date;

    @Column({
        name: 'r_mode_paiement',
        type: "enum",
        enum: ["espece", "carte", "mobile_money"],
        default: "espece"}
    )
    mode_paiement: ModePaiement;

    @Column({name: 'r_statut', nullable: true, type: 'character varying', length: 10})
    statut: string;

    @Column({name: 'r_libelle', nullable: true, type: 'character varying', length: 35})
    libelle: string;

    @Column({name: 'r_description', nullable: true, type: 'text'})
    description: string;

    @ManyToOne(
        type => Fournisseur,
        (fournisseur) => fournisseur.achat,
        {eager: true}
    )
    fournisseur: Fournisseur

    @OneToMany(
        type => DetailAchat,
        (detail_achat) => detail_achat.achat,
        {onDelete: 'CASCADE'}
    )
    detail_achat: DetailAchat[];

    @OneToMany(
        type => HistoriqueStock,
        (historique_stock) => historique_stock.achat,
        {onDelete: 'CASCADE'}
    )
    historique_stock: HistoriqueStock[];

    @ManyToOne(type => Boutique, (boutique) => boutique.achat, {eager: false, nullable: false})
    boutique: Boutique[];
}
