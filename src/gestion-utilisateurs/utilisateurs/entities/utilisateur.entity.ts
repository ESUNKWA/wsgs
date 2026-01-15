import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Structure } from "src/gestion-boutiques/structure/entities/structure.entity";
import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";
import { Vente } from "src/gestion-ventes/vente/entities/vente.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('utilisateurs')
export class Utilisateur extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ name: 'r_email', nullable: true, type: 'character varying'})
    email: string;

    @Column({name: 'r_nom', length: 35, type: 'character varying'})
    nom: string;

    @Column({name: 'r_prenoms', length: 35, type: 'character varying'})
    prenoms: string;

    @Column({name: 'r_mot_de_passe', type: 'character varying'})
    mot_de_passe: string;

    @ManyToOne(type => Profil, (profil) => profil.utilisateur, {eager: true})
    profil: Profil;

    @OneToMany(() => Structure, (structure) => structure.responsable)
    structure: Structure[];

    @ManyToOne(() => Boutique, (boutique) => boutique.utilisateur, {eager: false, nullable: true})
    boutique: Boutique[];

    @OneToMany(() => Vente, (vente) => vente.user)
    vente: Vente[];

    @Column({name: 'r_is_admin', default: false})
    is_admin: boolean;

    @Column({name: 'r_telephone', length: 10, type: 'character varying', nullable: false})
    telephone: string;
}
