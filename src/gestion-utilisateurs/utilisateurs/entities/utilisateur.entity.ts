import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Structure } from "src/gestion-boutiques/structure/entities/structure.entity";
import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('utilisateurs')
export class Utilisateur extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column({ name: 'r_email', nullable: true, type: 'character varying', unique: false })
    email!: string;

    @Column({ name: 'r_nom', length: 35, type: 'character varying' })
    nom!: string;

    @Column({ name: 'r_prenoms', length: 35, type: 'character varying' })
    prenoms!: string;

    @Column({ name: 'r_mot_de_passe', type: 'character varying' })
    mot_de_passe!: string;

    @ManyToOne(type => Profil, (profil) => profil.utilisateur, { eager: true })
    profil!: Profil;

    @OneToMany(() => Structure, (structure) => structure.responsable)
    structure!: Structure[];

    @Column({ name: 'r_boutique_id', nullable: true, type: 'integer' })
    boutique_id!: number | null;

    @Column({ name: 'r_is_admin', default: false })
    is_admin!: boolean;

    @Column({ name: 'r_structure_id', nullable: true, type: 'integer' })
    structure_id!: number | null;

    @Column({ name: 'r_telephone', length: 10, type: 'character varying', nullable: false, unique: false })
    telephone!: string;
}
