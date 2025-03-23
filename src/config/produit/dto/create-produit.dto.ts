import { IsNotEmpty, Length } from "class-validator";
import { Categorie } from "src/config/categorie/entities/categorie.entity";

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
}
