import { Injectable } from '@nestjs/common';
import { ProduitService } from 'src/config/produit/produit.service';
import { AchatService } from 'src/gestion-achats/achat/achat.service';
import { DetailAchatService } from 'src/gestion-achats/detail-achat/detail-achat.service';
import { ProfilsService } from 'src/gestion-utilisateurs/profils/profils.service';
import { UtilisateursService } from 'src/gestion-utilisateurs/utilisateurs/utilisateurs.service';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';

@Injectable()
export class DataProviderService {
    constructor(
    private readonly produitService: ProduitService,
    private readonly venteService: VenteService,
    private readonly usersService: UtilisateursService,
    //private readonly profilService: DetailAchatService,
    //private readonly achatService: AchatService,
  ) {}

  async getData(source: string, filters: any) {
    switch (source) {
      case 'produits':
        return await this.produitService.findAll(filters);

      case 'ventes':
        return await this.venteService.findAll(filters);

    case 'users':
        return await this.usersService.findAll("1","");
    
        //case 'detail_achat':
        //return await this.achatService.findAll(filters);

      default:
        throw new Error(`Source inconnue : ${source}`);
    }
  }
}
