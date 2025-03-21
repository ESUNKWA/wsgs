import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('t_produits')
export class Produit {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'r_nom',
        nullable: false,
        length: 35,
        type: 'character varying'
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

    @CreateDateColumn()
    created_at: Date;
    @UpdateDateColumn()
    updated_at: Date;
    @DeleteDateColumn()
    deleted_at: Date;
}
