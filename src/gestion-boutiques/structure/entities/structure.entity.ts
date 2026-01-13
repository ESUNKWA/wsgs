import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Utilisateur } from "src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_structures')
export class Structure extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_nom', nullable: false, unique: true, type:'character varying', length:35})
    nom: string;

    @Column({name: 'r_telephone', nullable: true, unique: true, type:'character varying', length:15})
    telephone: string;

    @Column({name: 'r_email', nullable: true, unique: true, type:'character varying', length:35})
    email: string;

    @Column({name: 'r_situation_geo', nullable: true, type:'character varying', length:255})
    situation_geo: string;

    @Column({name: 'r_logo_path', nullable: true, type:'character varying', length:255})
    logo: string| null;

    @OneToMany(type => Boutique, (boutique) => boutique.structure, {eager: true})
    boutique: Boutique[];

    @ManyToOne( type=> Utilisateur, (responsable)=> responsable.structure, 
    {nullable: true, onDelete: 'SET NULL'})
    responsable: Utilisateur 
}
