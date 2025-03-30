import { IsNotEmpty } from "class-validator";
import { Utilisateur } from "src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity";

export class CreateStructureDto {
    
    @IsNotEmpty({message: 'Veuillez saisir le nom de la structure'})
    nom: string;
    
    @IsNotEmpty({message: 'Veuillez saisir le numéro de la structure'})
    telephone: string;
    email: string;
    rccm: string;
    situation_geo: string;
    logo: string;

    @IsNotEmpty({message: 'Veuillez sélectionnez le gestionnaire de la structure'})
    gestionnaire: Utilisateur;

}
