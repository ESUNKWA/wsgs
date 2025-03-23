import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { GenerateDate } from "src/module/generateDate";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('t_produits')
export class Produit extends GenerateDate {
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
}
