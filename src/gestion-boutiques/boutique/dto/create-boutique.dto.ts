import { IsNotEmpty } from "class-validator";
import { Structure } from "src/gestion-boutiques/structure/entities/structure.entity";

export class CreateBoutiqueDto {
    @IsNotEmpty({message: 'Veuillez saisir le nom de la structure'})
    nom: string;
    
    @IsNotEmpty({message: 'Veuillez saisir le numéro de la structure'})
    telephone: string;
    email: string;
    rccm: string;
    situation_geo: string;
    logo: string;

    @IsNotEmpty({message: 'Veuillez sélectionner la structure'})
    structure: Structure;
}
