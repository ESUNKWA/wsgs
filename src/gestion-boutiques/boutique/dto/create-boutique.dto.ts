import { IsNotEmpty } from "class-validator";

export class CreateBoutiqueDto {
    @IsNotEmpty({message: 'Veuillez saisir le nom de la boutique'})
    nom: string;

    @IsNotEmpty({message: 'Veuillez saisir le numéro de la boutique'})
    telephone: string;
    email: string;
    rccm: string;
    situation_geo: string;
    logo: string;

    @IsNotEmpty({message: 'Veuillez sélectionner la structure'})
    structure: number;

    gestion_caisse_activee: boolean;
    type: 'boutique' | 'restaurant';
}
