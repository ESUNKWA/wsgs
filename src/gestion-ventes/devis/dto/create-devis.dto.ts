import { IsNotEmpty } from 'class-validator';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Client } from 'src/gestion-ventes/client/entities/client.entity';
import { StatutDevis } from '../entities/devis.entity';

export class CreateDevisDto {
  reference: string;

  @IsNotEmpty({ message: 'Le montant total est requis' })
  montant_total: number;

  montant_total_apres_remise: number;
  remise: number;
  date_expiration: Date;
  notes: string;
  statut: StatutDevis;

  @IsNotEmpty({ message: 'La boutique est requise' })
  boutique: Boutique;

  client: Client;
  clientdata: any;

  @IsNotEmpty({ message: 'Les lignes du devis sont requises' })
  detail_devis: any[];

  user: any;
}
