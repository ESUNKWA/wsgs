import { IsNotEmpty } from "class-validator";
import { Categorie } from "src/config/categorie/entities/categorie.entity";
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

    stock_disponible: number;
    stock_initial: number;

    seuil_alert: number;
}
