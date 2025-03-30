import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { Structure } from "src/gestion-boutiques/structure/entities/structure.entity";
import { Utilisateur } from "src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_boutiques')
export class Boutique {
    @PrimaryGeneratedColumn()
        id: number;
    
    @Index()
    @Column({name: 'r_nom', nullable: false, unique: true, type:'character varying', length:35})
    nom: string;

    @Column({name: 'r_telephone', nullable: false, unique: true, type:'character varying', length:15})
    telephone: string;

    @Column({name: 'r_email', nullable: true, unique: true, type:'character varying', length:35})
    email: string;

    @Column({name: 'r_rccm', nullable: true, unique: true, type:'character varying', length:35})
    rccm: string;

    @Column({name: 'r_situation_geo', nullable: true, unique: true, type:'character varying', length:255})
    situation_geo: string;

    @Column({name: 'r_logo_path', nullable: true, unique: true, type:'character varying', length:255})
    logo: string| null;

    @ManyToOne(type=> Structure, (structure) => structure.boutique, {eager: false, nullable: false})
    structure: Structure

    @OneToMany(type=> Utilisateur, (utilisateur) => utilisateur.boutique)
    utilisateur: Utilisateur

    @OneToMany(produit=> Produit, (produit) => produit.boutique)
    produit: Produit[]

    @OneToMany(achat=> Achat, (achat) => achat.boutique)
    achat: Achat[]
}
