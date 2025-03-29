import { IsEmail, IsNotEmpty } from "class-validator";
import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";

export class CreateUtilisateurDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom de l\'utilisateur'})
    nom: string;

    @IsNotEmpty({message: 'Veuillez saisir le prenoms de l\'utilisateur'})
    prenoms: string;

    @IsNotEmpty({message: 'Veuillez saisir le mail de l\'utilisateur'})
    email: string;

    @IsNotEmpty({message: 'Veuillez saisir le profil de l\'utilisateur'})
    profil: Profil

    @IsNotEmpty({message: 'Veuillez saisir le mot de passe de l\'utilisateur'})
    mot_de_passe: string
}
