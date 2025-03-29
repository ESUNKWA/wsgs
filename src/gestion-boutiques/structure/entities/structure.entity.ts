import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_structures')
export class Structure {
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
}
