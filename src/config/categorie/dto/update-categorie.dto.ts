import { PartialType } from '@nestjs/mapped-types';
import { CreateCategorieDto } from './create-categorie.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateCategorieDto extends PartialType(CreateCategorieDto) {
    @IsNotEmpty({
        message: 'Veuillez saisir le nom de la catégorie'
    })
    nom: string;
    description: string;
}
