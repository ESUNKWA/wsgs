import { Vente } from "src/gestion-ventes/vente/entities/vente.entity";
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_clients')
export class Client {
    @PrimaryGeneratedColumn({unsigned: true})
    id: number;

    @Column({ name: 'r_nom', type: 'character varying', length: 35, nullable: true})
    nom: string;

    @Column({ name: 'r_prenoms', type: 'character varying', length: 35, nullable: true})
    prenoms: string;

    @Index()
    @Column({ name: 'r_telephone', type: 'character varying', length: 35, nullable: true, unique: true})
    telephone: string;

    @Index()
    @Column({ name: 'r_email', type: 'character varying', length: 255, nullable: true})
    email: string;

    @Column({ name: 'r_description', type: 'text', nullable: true}) 
    description: string;

    @OneToMany(type=> Vente, (vente)=> vente.client)
    vente: Vente[];
}
