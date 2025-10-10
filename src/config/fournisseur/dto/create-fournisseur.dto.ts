import { IsNotEmpty } from "class-validator";

export class CreateFournisseurDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom du fournisseur'})
    nom: string;

    @IsNotEmpty({message: 'Veuillez saisir l\'emplacement géographique du fournisseur'})
    addresse_geo: string;

    @IsNotEmpty({message: 'Veuillez saisir le noméro du fournisseur'})
    contact: string;

    @IsNotEmpty({message: 'Veuillez saisir l\'adresse email du fournisseur'})
    email: string;
}
