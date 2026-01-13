import { IsNotEmpty } from "class-validator";

export class CreateFournisseurDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom du fournisseur'})
    nom: string;

    addresse_geo: string;

    @IsNotEmpty({message: 'Veuillez saisir le noméro du fournisseur'})
    contact: string;

    email: string;
}
