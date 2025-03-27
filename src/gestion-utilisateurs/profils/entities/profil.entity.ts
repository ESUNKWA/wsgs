import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_profils')
export class Profil extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({name: 'r_nom', type:'character varying', length: 34, unique: true})
    nom: string;

    @Column({name: 'r_description', type: 'text'})
    description: string;
}
