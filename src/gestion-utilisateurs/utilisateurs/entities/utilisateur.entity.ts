import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('utilisateurs')
export class Utilisateur {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ unique: true })
    email: string;

    @Index()
    @Column()
    nom: string;

    @Column({name: 'r_prenoms', length: 35, type: 'character varying'})
    prenoms: string;

    @Column()
    mot_de_passe: string;

    @ManyToOne(type => Profil, (profil) => profil.utilisateur, {eager: true})
    profil: Profil;
}
