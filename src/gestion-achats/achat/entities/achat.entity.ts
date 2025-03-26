import { GenerateDate } from "src/module/generateDate";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type ModePaiement = "espece" | "espece" | "carte"| "mobile_money";

@Entity('t_achats')
export class Achat extends GenerateDate {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'r_reference', type: 'character varying', length: 10})
    reference: string;

    @Column({name: 'r_montant_total', nullable: false, type: 'real'})
    montant_total: number;

    @Column({name: 'r_date_achat', nullable: true, type: 'timestamp'})
    date_achat: Date;

    @Column({
        type: "enum",
        enum: ["espece", "carte", "mobile_money"],
        default: "espece"}
    )
    mode_paiement: ModePaiement;

    @Column({name: 'r_statut', nullable: true, type: 'character varying', length: 10})
    statut: string;
}
