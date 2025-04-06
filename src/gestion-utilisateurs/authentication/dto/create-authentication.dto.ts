import { IsNotEmpty } from "class-validator";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";

export class CreateAuthenticationDto {

    @IsNotEmpty({message: 'Veuillez saisir votre adresse email'})
    email: string;

    @IsNotEmpty({message: 'Veuillez saisir votre mot de passe'})
    mot_de_passe: string;
}
