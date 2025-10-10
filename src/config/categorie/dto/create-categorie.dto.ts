import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateCategorieDto {

    @ApiPropertyOptional({name: undefined})
    @IsNotEmpty({
        message: 'Veuillez saisir le nom de la catégorie'
    })
    nom: string;

    @ApiProperty()
    description: string;
}
