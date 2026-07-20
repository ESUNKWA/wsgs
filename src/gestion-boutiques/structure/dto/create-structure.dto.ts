import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateStructureDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom de la structure'})
    nom: string;

    telephone: string;
    email: string;
    rccm: string;
    situation_geo: string;
    logo: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value != null && value !== '' ? parseInt(value, 10) : null))
    categorieId?: number | null;

    @IsOptional()
    couleur_primaire?: string | null;

    @IsOptional()
    couleur_secondaire?: string | null;
}
