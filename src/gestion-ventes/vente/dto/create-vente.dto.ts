import { IsNotEmpty } from "class-validator";
import { Boutique } from "src/gestion-boutiques/boutique/entities/boutique.entity";
import { Client } from "src/gestion-ventes/client/entities/client.entity";
import { DetailVente } from "src/gestion-ventes/detail-vente/entities/detail-vente.entity";

export class CreateVenteDto {
    reference: string;
    
    @IsNotEmpty({message: 'Le montant total de l\'achat est réquis'})
    montant_total: number;

    @IsNotEmpty({message: 'Le status achat est réquis'})
    statut: string;

    @IsNotEmpty({message: 'Aucune vente effectué pour l\'instant'})
    detail_vente: DetailVente[];

    @IsNotEmpty({message: 'Aucune boutique reconnue'})
    boutique: Boutique;
  
    static reference: string;

    client: Client;

    montant_total_apres_remise: number;
    remise: number;
}
