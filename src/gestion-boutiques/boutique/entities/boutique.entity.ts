import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { Fournisseur } from "src/config/fournisseur/entities/fournisseur.entity";
import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_boutiques')
export class Boutique {
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Index()
    @Column({ name: 'r_nom', nullable: false, unique: true, type: 'character varying', length: 35 })
    nom!: string;

    @Column({ name: 'r_telephone', nullable: false, unique: false, type: 'character varying', length: 15 })
    telephone!: string;

    @Column({ name: 'r_email', nullable: true, unique: false, type: 'character varying', length: 35 })
    email!: string;

    @Column({ name: 'r_rccm', nullable: true, unique: false, type: 'character varying', length: 35 })
    rccm!: string;

    @Column({ name: 'r_situation_geo', nullable: true, unique: false, type: 'character varying', length: 255 })
    situation_geo!: string;

    @Column({ name: 'r_logo_path', nullable: true, unique: false, type: 'character varying', length: 255 })
    logo!: string | null;

    @Column({ name: 'r_structure_id', type: 'integer', nullable: true, })
    structure_id!: number;


    @OneToMany(produit => Produit, (produit) => produit.boutique)
    produit!: Produit[];

    @OneToMany(achat => Achat, (achat) => achat.boutique)
    achat!: Achat[];

    @OneToMany(() => Fournisseur, (fournisseur) => fournisseur.boutique)
    fournisseur!: Fournisseur;

    @OneToMany(() => Categorie, (categorie) => categorie.boutique)
    categorie!: Categorie;

    @Column({ name: 'r_type', type: 'varchar', length: 20, default: 'boutique' })
    type!: 'boutique' | 'restaurant';

    @Column({ name: 'r_gestion_caisse_activee', type: 'boolean', default: false })
    gestion_caisse_activee!: boolean;


    @Column({ name: 'r_is_active', type: 'boolean', default: true })
    is_active!: boolean;
}
