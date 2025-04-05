import { IsNotEmpty } from "class-validator";
import { DetailAchat } from "src/gestion-achats/detail-achat/entities/detail-achat.entity";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";

export class CreateAchatDto {

    
    reference: string;

    @IsNotEmpty({message: 'Le montant total de l\'achat est réquis'})
    montant_total: number;

    @IsNotEmpty({message: 'La d\'achat est réquis'})
    date_achat: number;

    @IsNotEmpty({message: 'Le status achat est réquis'})
    statut: string;

    @IsNotEmpty({message: 'Aucun achat effectué pour l\'instant'})
    detail_achat: DetailAchat[];

    @IsNotEmpty({message: 'Aucune boutique reconnue'})
    boutique: Boutique[];
}
