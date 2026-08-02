import { IsNotEmpty } from "class-validator";
import { ModePaiement } from "src/gestion-achats/achat/entities/achat.entity";

export class LigneComptageDto {
    produit: number;
    quantite_restante: number;
    prix_unitaire_vente?: number;
}

export class CreateVenteComptageDto {
    @IsNotEmpty({message: 'Aucune boutique reconnue'})
    boutique: number;

    @IsNotEmpty({message: 'Aucun produit compté'})
    lignes: LigneComptageDto[];

    statut: string;
    mode_paiement: ModePaiement;
    montant_recu: number;
    remise: number;
    details_paiement: any;

    user: any;
    vendeur_tel: string | null;
}
