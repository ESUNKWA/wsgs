import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_detail_achats')
export class DetailAchat {
    @PrimaryGeneratedColumn()
    id: number;
    produit: number;
    quantite: number;
    prix_unitaire: number;
    fournisseur: number;
    achat: number;
}
