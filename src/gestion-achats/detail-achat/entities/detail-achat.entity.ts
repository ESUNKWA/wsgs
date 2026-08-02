import { Produit } from "src/config/produit/entities/produit.entity";
import { Achat } from "src/gestion-achats/achat/entities/achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('t_detail_achats')
export class DetailAchat extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'r_quantite', type: 'integer', nullable: false})
    quantite: number;

    @Column({name: 'r_prix_unitaire', type: 'real', nullable: false})
    prix_unitaire: number;

    // Traçabilité de la saisie d'origine (unité de détail ou carton/casier) —
    // `quantite`/`prix_unitaire` ci-dessus restent la source de vérité en unité
    // de détail ; ces champs ne servent qu'à rouvrir le formulaire dans le bon mode.
    @Column({name: 'r_mode_saisie', type: 'character varying', length: 10, nullable: true, default: 'unite'})
    mode_saisie: string | null;

    @Column({name: 'r_quantite_colis', type: 'real', nullable: true})
    quantite_colis: number | null;

    @Column({name: 'r_prix_colis', type: 'real', nullable: true})
    prix_colis: number | null;

    @ManyToOne(type=> Produit, (produit) => produit.detail_achat, {eager: true})
    produit: Produit;

    @ManyToOne(type=> Achat, (achat) => achat.detail_achat, {eager: true, nullable: false})
    @JoinColumn({ name: 'achatId' })
    achat: Achat;
}
