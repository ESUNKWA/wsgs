import { IsEmail, IsNotEmpty } from "class-validator";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";

export class CreateUtilisateurDto {

    @IsNotEmpty({message: 'Veuillez saisir le nom de l\'utilisateur'})
    nom: string;

    @IsNotEmpty({message: 'Veuillez saisir le prenoms de l\'utilisateur'})
    prenoms: string;

    email: string;

    @IsNotEmpty({message: 'Veuillez saisir le profil de l\'utilisateur'})
    profil: Profil

    mot_de_passe: string

    //@IsNotEmpty({message: 'Veuillez selectionner la boutique de l\'utilisateur'})
    boutique: Boutique[];

    @IsNotEmpty({message: 'Veuillez saisir le numéro de téléphone de l\'utilisateur'})
    phone: string;

    is_admin: boolean;
}
