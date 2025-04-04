import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_fournisseurs')
export class Fournisseur extends defaultDateGeneratorHelper {

    @PrimaryGeneratedColumn({unsigned: true})
    id: number;

    @Index()
    @Column({
        name: 'r_nom', 
        nullable: false, 
        type: 'character varying',
        length: 35,
        unique: true
    })
    nom: string;
    
    @Column({
        name: 'r_addresse_geo', 
        nullable: false, 
        type: 'character varying',
        length: 35,
        unique: false
    })
    addresse_geo: string;

    @Column({
        name: 'r_contact', 
        nullable: false, 
        type: 'character varying',
        length: 20,
        unique: true
    })
    contact: string;

    @Column({
        name: 'r_email', 
        nullable: true, 
        type: 'character varying',
        length: 35,
        unique: true
    })
    email: string;

    @Column({
        name: 'r_interlocuteur', 
        nullable: true, 
        type: 'character varying',
        length: 35
    })
    interlocuteur: string

    @Column({
        name: 'r_contact_interlocuteur', 
        nullable: true, 
        type: 'character varying',
        length: 20,
        unique: true
    })
    contact_interlocuteur: string

    @OneToMany(
        type => Achat,
        (achat) => achat.fournisseur,
        {onDelete: 'CASCADE'}
    )
    achat: Achat[];
}
