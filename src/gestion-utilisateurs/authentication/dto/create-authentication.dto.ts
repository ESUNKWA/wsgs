import { IsNotEmpty } from "class-validator";

export class CreateAuthenticationDto {

    @IsNotEmpty({message: 'Veuillez saisir votre adresse email'})
    email: string;

    @IsNotEmpty({message: 'Veuillez saisir votre mot de passe'})
    mot_de_passe: string;
}
