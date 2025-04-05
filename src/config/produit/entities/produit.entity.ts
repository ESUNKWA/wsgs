import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index,  ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { HistoriqueStock } from "src/gestion-achats/historique-stock/entities/historique-stock.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";

@Entity('t_produits')
export class Produit extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({
        name: 'r_nom',
        nullable: false,
        length: 35,
        type: 'character varying',
        unique: true
    })
    nom: string;

    @Column({
        name: 'r_prix_achat',
        nullable: false,
        type: 'real',
        default: 0
    })
    prix_achat: number;
    
    @Column({
        name: 'r_prix_vente',
        nullable: false,
        type: 'real',
        default: 0
    })
    prix_vente: number;

    @Column({
        name: 'r_stock_initial',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_initial: number;

    @Column({
        name: 'r_stock_physique',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_physique: number;

    @Column({
        name: 'r_stock_reserve',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_reserve: number;

    @Column({
        name: 'r_stock_minimum',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_minimum: number;

    @Column({
        name: 'r_stock_disponible',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_disponible: number;
    
    @Column({
        name: 'r_description',
        type: 'text',
        nullable: true
    })
    description: string;

    @ManyToOne(type => Categorie, (categorie) => categorie.produits, {nullable: true,  eager: true})
    categorie: Categorie;

    @OneToMany(
        type => DetailAchat,
        (detail_achat) => detail_achat.produit,
        {onDelete: 'CASCADE'}
    )
    detail_achat: DetailAchat;

    @OneToMany(
        type => HistoriqueStock,
        (historique_stock) => historique_stock.produit,
        {onDelete: 'CASCADE'}
    )
    historique_stock: HistoriqueStock;

    @Column({name: 'r_image', type:'character varying', length: 255, nullable: true})
    image: string| null;

    @ManyToOne(type => Boutique, (boutique) => boutique.produit, {eager: true})
    boutique: Boutique[];
}
