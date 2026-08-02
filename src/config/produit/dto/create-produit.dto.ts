import { IsNotEmpty, IsOptional } from "class-validator";
import { Categorie } from "src/config/categorie/entities/categorie.entity";
import { Fournisseur } from "src/config/fournisseur/entities/fournisseur.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";

export class CreateProduitDto {

    @IsNotEmpty({
        message: 'Veuillez saisir le nom du produit'
    })
    nom: string;

    @IsNotEmpty({
        message: 'Veuillez saisir le prix d\'achat du produit'
    })
    prix_achat: number;

    @IsNotEmpty()
    categorie: Categorie;

    image: string

    @IsNotEmpty({
        message: 'Veuillez sélectionnez la boutique'
    })
    boutique: Boutique[];

    @IsOptional()
    fournisseur: Fournisseur;

    stock_disponible: number;
    stock_initial: number;
    seuil_alert: number;
    unite_mesure: string;
    code_barre: string;

    @IsOptional()
    unite_conditionnement: string;

    @IsOptional()
    quantite_par_conditionnement: number;
}
