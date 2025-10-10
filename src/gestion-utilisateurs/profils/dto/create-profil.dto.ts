import { IsNotEmpty } from "class-validator";

export class CreateProfilDto {

    @IsNotEmpty({message: 'Veuillez saisir le profil'})
    nom: string
}
