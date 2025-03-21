import { IsNotEmpty } from "class-validator";

export class CreateCategorieDto {

    @IsNotEmpty({
        message: 'Veuillez saisir le nom de la catégorie'
    })
    nom: string;
    description: string;
}
