import { IsNotEmpty } from "class-validator";

export class CreateClientDto {
    nom: string;
    prenoms: string;
    @IsNotEmpty({message: 'Veuillez saisir le numéro de téléphone du client'})
    telephone: string;
    email: string;
    description: string;
}
