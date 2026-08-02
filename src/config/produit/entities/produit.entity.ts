import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { defaultDateGeneratorHelper } from "src/common/helpers/default-date-genarate";
import { Column, Entity, Index,  ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { HistoriqueStock } from "src/gestion-achats/historique-stock/entities/historique-stock.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Fournisseur } from "src/config/fournisseur/entities/fournisseur.entity";

@Unique(['boutique', 'nom'])
@Entity('t_produits')
export class Produit extends defaultDateGeneratorHelper {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({
        name: 'r_nom',
        nullable: false,
        length: 255,
        type: 'character varying'
    })
    nom: string;

    @Column({
        name: 'r_prix_achat',
        nullable: false,
        type: 'real',
        default: 0
    })
    prix_achat: number;
    
    @Column({
        name: 'r_prix_vente',
        nullable: false,
        type: 'real',
        default: 0
    })
    prix_vente: number;

    @Column({
        name: 'r_stock_initial',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_initial: number;

    @Column({
        name: 'r_stock_physique',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_physique: number;

    @Column({
        name: 'r_stock_reserve',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_reserve: number;

    @Column({
        name: 'r_stock_minimum',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_minimum: number;

    @Column({
        name: 'r_stock_disponible',
        nullable: true,
        type: 'real',
        default: 0
    })
    stock_disponible: number;
    
    @Column({
        name: 'r_description',
        type: 'text',
        nullable: true
    })
    description: string;

    @ManyToOne(type => Categorie, (categorie) => categorie.produits, {nullable: true,  eager: true})
    categorie: Categorie;

    @OneToMany(
        type => DetailAchat,
        (detail_achat) => detail_achat.produit,
        {onDelete: 'CASCADE'}
    )
    detail_achat: DetailAchat;

    @OneToMany(
        type => HistoriqueStock,
        (historique_stock) => historique_stock.produit,
        {onDelete: 'CASCADE'}
    )
    historique_stock: HistoriqueStock;

    @Column({name: 'r_image', type:'character varying', length: 255, nullable: true})
    image: string| null;

    @ManyToOne(type => Boutique, (boutique) => boutique.produit, {eager: true})
    boutique: Boutique[];

    @ManyToOne(type => Fournisseur, (fournisseur) => fournisseur.produits, {nullable: true, eager: true})
    fournisseur: Fournisseur | null;

    @Column({name: 'r_seuil_alert', type:'integer', default: 2, nullable: true})
    seuil_alert: number;

    @Column({name: 'r_unite_mesure', type: 'character varying', length: 20, nullable: true, default: 'pièce'})
    unite_mesure: string;

    // Conditionnement d'approvisionnement (carton, casier, palette…) — optionnel.
    // Le stock reste toujours compté en `unite_mesure` (détail) ; ce facteur ne sert
    // qu'à convertir une saisie d'achat "par carton" en unités de détail.
    @Column({name: 'r_unite_conditionnement', type: 'character varying', length: 20, nullable: true})
    unite_conditionnement: string | null;

    @Column({name: 'r_quantite_par_conditionnement', type: 'real', nullable: true})
    quantite_par_conditionnement: number | null;

    @Index()
    @Column({name: 'r_code_barre', type: 'character varying', length: 100, nullable: true})
    code_barre: string | null;

    // Promotion temporaire : si renseignée et que la date du jour est dans l'intervalle,
    // `prix_promo` remplace `prix_vente` (calculé à la lecture, jamais persisté ailleurs).
    @Column({name: 'r_prix_promo', type: 'real', nullable: true})
    prix_promo: number | null;

    @Column({name: 'r_promo_date_debut', type: 'date', nullable: true})
    promo_date_debut: string | null;

    @Column({name: 'r_promo_date_fin', type: 'date', nullable: true})
    promo_date_fin: string | null;
}
