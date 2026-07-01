import { IsNotEmpty } from "class-validator";
import { Profil } from "src/gestion-utilisateurs/profils/entities/profil.entity";

export class CreateUtilisateurDto {

    @IsNotEmpty({ message: 'Veuillez saisir le nom de l\'utilisateur' })
    nom!: string;

    @IsNotEmpty({ message: 'Veuillez saisir le prenoms de l\'utilisateur' })
    prenoms!: string;

    email!: string;

    @IsNotEmpty({ message: 'Veuillez saisir le profil de l\'utilisateur' })
    profil!: Profil;

    mot_de_passe!: string;

    boutique_id!: number | null;

    @IsNotEmpty({ message: 'Veuillez saisir le numéro de téléphone de l\'utilisateur' })
    telephone!: string;

    is_admin!: boolean;

    structure_id!: number | null;
}
