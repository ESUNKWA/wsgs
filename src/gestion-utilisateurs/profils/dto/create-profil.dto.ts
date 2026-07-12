import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateProfilDto {

    @IsNotEmpty({message: 'Veuillez saisir le profil'})
    nom: string;

    @IsOptional()
    code?: string;

    @IsOptional()
    description?: string;
}
