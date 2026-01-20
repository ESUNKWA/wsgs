import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { ModePaiement } from "src/gestion-achats/achat/entities/achat.entity";
import { HistoriqueStock } from "src/gestion-achats/historique-stock/entities/historique-stock.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Utilisateur } from "src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity";
import { Client } from "src/gestion-ventes/client/entities/client.entity";
import { DetailVente } from "src/gestion-ventes/detail-vente/entities/detail-vente.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_ventes')
export class Vente extends defaultDateGeneratorHelper {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_reference', type: 'character varying', length: 20, unique: true})
    reference: string;

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

    @OneToMany(
        type => HistoriqueStock,
        (historique_stock) => historique_stock.achat,
        {onDelete: 'CASCADE'}
    )
    historique_stock: HistoriqueStock[];

    @ManyToOne(type => Boutique, (boutique) => boutique.achat, {eager: false, nullable: false})
    boutique: Boutique;

    @ManyToOne(type => Utilisateur, (user) => user.vente, {eager: true, nullable: false})
    user: Utilisateur;

    @OneToMany(
        type => DetailVente,
        (detail_vente) => detail_vente.vente,
        {onDelete: 'CASCADE'}
    )
    detail_vente: DetailVente[];

    @ManyToOne(type => Client, (client) => client.vente, {eager: true, nullable: true})
    client: Client;

    @Column({name: 'r_montant_total', nullable: false, type: 'real'})
    montant_total: number;

    @Column({name: 'r_remise', nullable: true, type: 'real'})
    remise: number;

    @Column({name: 'r_montant_recu', nullable: true, type: 'real'})
    montant_recu: number;

    @Column({name: 'r_monnaie_rendu', nullable: true, type: 'real'})
    monnaie_rendu: number;

    @Column({name: 'r_montant_total_apres_remise', nullable: true, default:0, type: 'real'})
    montant_total_apres_remise: number;
}
