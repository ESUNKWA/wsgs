import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Utilisateur } from "src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity";
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_profils')
export class Profil extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_code', type:'character varying', length: 10, unique: true, nullable: true})
    code: string;

    @Index()
    @Column({name: 'r_nom', type:'character varying', length: 34, unique: true})
    nom: string;

    @Column({name: 'r_description', type: 'text'})
    description: string;

    @OneToMany(type=> Utilisateur, (utilisateur) => utilisateur.profil)
    utilisateur: Utilisateur[];
}
