import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateFournisseurDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom du fournisseur'})
    nom: string;

    @IsOptional()
    addresse_geo: string;

    @IsNotEmpty({message: 'Veuillez saisir le numéro du fournisseur'})
    contact: string;

    @IsOptional()
    email: string;

    @IsOptional()
    interlocuteur: string;

    @IsOptional()
    contact_interlocuteur: string;

    @IsOptional()
    boutique: number;
}
