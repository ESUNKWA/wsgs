import { PartialType } from '@nestjs/swagger';
import { CreateStructureDto } from './create-structure.dto';
import { IsNotEmpty } from 'class-validator';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';

export class UpdateStructureDto extends PartialType(CreateStructureDto) {
    @IsNotEmpty({message: 'Veuillez saisir le nom de la structure'})
    nom: string;
        
  
    telephone: string;
    email: string;
    rccm: string;
    situation_geo: string;
    logo: string;
    gestionnaire: Utilisateur;
}
