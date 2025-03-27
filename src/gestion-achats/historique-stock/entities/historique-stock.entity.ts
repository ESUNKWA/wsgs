import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export type Mouvement = "entree" | "sortie";
export type Source = "achat" | "vente" | "ajustement";

@Entity('t_historique_stock')
export class HistoriqueStock extends defaultDateGeneratorHelper {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'r_mouvement',
        type: "enum",
        enum: ["entree", "sortie"],
        comment: 'Pour savoir si on à fait une entrée de produit ou une sortie'},
    )
    mouvement: Mouvement;

    @Column({name: 'r_quantite', type: 'integer', nullable: false})
    quantite: number;
    
    @Column({name: 'r_source',type: "enum",enum: ["achat", "vente", "ajustement"], default: "achat", comment: 'Pour savoir si on à fait un achat ou une vente'})
    source: Source;
    
    @ManyToOne(type=> Produit, (produit) => produit.historique_stock, {eager: true})
    produit: Produit;

    @ManyToOne(type=> Achat, (achat) => achat.historique_stock, {eager: true})
    achat: Achat;
}
