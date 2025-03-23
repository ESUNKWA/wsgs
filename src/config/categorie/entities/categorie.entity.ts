import { Produit } from "src/config/produit/entities/produit.entity";
import { GenerateDate } from "src/module/generateDate";
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_categorie')
export class Categorie extends GenerateDate {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({
        name: 'r_nom',
        type: 'character varying',
        length: 35,
        nullable: false,
        unique: true
    })
    nom: string;

    @Column({
        name: 'r_description',
        type: 'text',
        nullable: true
    })
    description: string;

    @OneToMany(
        type=> Produit,
        (produit) => produit.categorie
    )
    produits: Produit[];
}
