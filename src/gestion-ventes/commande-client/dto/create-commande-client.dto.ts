import { IsNotEmpty } from 'class-validator';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

export class CreateCommandeClientDto {
  reference: string;

  @IsNotEmpty({ message: 'Le montant total est requis' })
  montant_total: number;

  montant_total_apres_remise: number;
  remise: number;
  date_livraison_prevue: Date;
  notes: string;
  client: any;
  clientdata: any;

  @IsNotEmpty({ message: 'La boutique est requise' })
  boutique: Boutique;

  @IsNotEmpty({ message: 'Les lignes de commande sont requises' })
  detail_commande: any[];

  user: any;
}
