import { IsNotEmpty, Length } from "class-validator";

export class CreateProduitDto {

    @IsNotEmpty({
        message: 'Veuillez saisir le nom du produit'
    })
    
    nom: string;

    @IsNotEmpty({
        message: 'Veuillez saisir le prix d\'achat du produit'
    })
    prix_achat: number;
}
