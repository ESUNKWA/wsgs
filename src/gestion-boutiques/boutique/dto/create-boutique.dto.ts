import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateBoutiqueDto {
    @IsNotEmpty({message: 'Veuillez saisir le nom de la boutique'})
    nom: string;

    @IsOptional()
    telephone: string;

    @IsOptional()
    email: string;

    @IsOptional()
    rccm: string;

    @IsOptional()
    situation_geo: string;

    @IsOptional()
    logo: string;

    @IsNotEmpty({message: 'Veuillez sélectionner la structure'})
    structure: number;

    @IsOptional()
    gestion_caisse_activee: boolean;

    @IsOptional()
    type: 'boutique' | 'restaurant' | 'entrepot' | 'departement';
}
