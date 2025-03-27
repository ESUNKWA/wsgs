import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index,  ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

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
        name: 'r_quantite_stock',
        nullable: true,
        type: 'real',
        default: 0
    })
    quantite_stock: number;
    
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
}
