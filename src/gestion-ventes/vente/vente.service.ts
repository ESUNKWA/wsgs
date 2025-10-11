import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Vente } from './entities/vente.entity';
import { DetailVente } from '../detail-vente/entities/detail-vente.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Client } from '../client/entities/client.entity';

@Injectable()
export class VenteService {

  constructor( 
      private readonly dataSource: DataSource,
      @InjectRepository(Vente) private venteRepository: Repository<Vente>,
      @InjectRepository(DetailVente) private detailventeRepository: Repository<DetailVente>,
      @InjectRepository(HistoriqueStock) private historiqueStockRepository: Repository<HistoriqueStock>,
      @InjectRepository(Client) private clientRepository: Repository<Client>,
      
    ){}
    
  async create(createVenteDto: CreateVenteDto): Promise<Vente>  {
    try {
    
      return await this.dataSource.transaction(async (manager)=>{

          //créer un nouvel client
          const client = manager.create(Client, createVenteDto.client);
          const registerClient = await manager.save(client);

          // Créer un nouvel vente
          createVenteDto.reference = ReferenceGeneratorHelper.generate('VNT'); // utilisation du helper
          createVenteDto.client = registerClient;
          const vente = manager.create(Vente, createVenteDto);
        
          // Sauvegarder la vente
          const venteSauvegarde = await manager.save(vente);
          
          // Ajouter les lignes de ventess
          const lignes = createVenteDto.detail_vente.map((ligne: any) => {
            return manager.create(DetailVente, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              prix_unitaire_vente: ligne.prix_unitaire_vente,
              vente: vente, // Associe chaque ligne à l'achat
            });
          });
          
          // Insérer toutes les lignes en une seule requête
          await manager.save(lignes);


          // Ajouter les lignes d'historisation des stocks
          const lignesHistorik = createVenteDto.detail_vente.map((ligne: any) => {
            return manager.create(HistoriqueStock, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              mouvement: 'sortie',
              source: 'vente',
              vente: vente, // Associe chaque ligne à l'achat
            });
          });
          
          // Insérer toutes les lignes en une seule requête
          await manager.save(lignesHistorik);

          
          // 1. Extraire les ids
          const produitsIds = createVenteDto.detail_vente.map((ligne: any) => ligne.produit);

          // 2. Charger les produits
          const produits = await manager.findBy(Produit, { id: In(produitsIds) });

          // 3. Ajuster le stock
          for (const produit of produits) {
            
                
              const ligne = createVenteDto.detail_vente.find((l: any) => l.produit == produit.id);
              
              if (ligne) {
                  produit.stock_disponible -= ligne.quantite; // ou - ligne.quantite selon le mouvement
              }
          }
          await manager.save(Produit, produits);

          return vente;

        });

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: {boutique: number}): Promise<Vente[]> {
    
     if (isNaN(query.boutique)) {
        throw new BadRequestException('Veuillez préciser la boutique.');
      }
      return await this.venteRepository.find({where: {boutique: {id: query.boutique}}, order: {montant_total: 'DESC'}});
  }

  async findOne(id: number): Promise<Vente> {
    const achat = await this.venteRepository.findOne({where: {id: id}, relations: ['detail_vente'], order: { created_at: 'ASC'}});
        if(!achat){
          throw new NotFoundException('Vente inexistant');
        }
        return achat;
  }

  async update(id: number, updateVenteDto: any): Promise<Vente> {
    try {
            return await this.dataSource.transaction(async (manager) => {

              //Modification client
              const client = await manager.preload(Client, {id, ...updateVenteDto .client});
              if (!client) {
                throw new Error('Client introuvable');
              }
              const registerClient = await manager.save(client);
    
              // 1. Charger l'achat existant
              //const achat = await manager.findOne(Achat, { where: { id }, relations: ['detail_achat'] });
              const vente = await manager.preload(Vente, {id, ...updateVenteDto });
             
              if (!vente) {
                throw new Error('Achat introuvable');
              }
              
              // 2. Supprimer les anciennes lignes (si c'est ce que tu veux)
              await manager.delete(DetailVente, { vente: vente.id });        
          
              // .3 Insérer les nouvelles lignes
              const lignes: DetailVente[] = updateVenteDto.detail_vente.map((ligne: any) => {
                const l = new DetailVente();
                l.produit = ligne.produit;
                l.quantite = ligne.quantite;
                l.prix_unitaire_vente = ligne.prix_unitaire_vente;
                l.vente = vente;
                return l;
              });
              
              // 4. Sauvegarder l'achat modifié
              await manager.save(Vente, vente);
              
              await manager.save(DetailVente, lignes);
    
               // 5. Supprimer les anciennes lignes d'historisation (si c'est ce que tu veux)
               await manager.delete(HistoriqueStock, { vente: vente.id }); 
    
              // Ajouter les lignes d'historisation des stocks
              const lignesHistorik = updateVenteDto.detail_vente.map((ligne: any) => {
                return manager.create(HistoriqueStock, {
                  produit: ligne.produit,
                  quantite: ligne.quantite,
                  mouvement: 'entree',
                  source: 'achat',
                  vente: vente, // Associe chaque ligne à l'achat
                });
              });
              
              // Insérer toutes les lignes en une seule requête
              await manager.save(lignesHistorik);
    
              // 6. Extraire les ids
              const produitsIds = updateVenteDto.detail_vente.map((ligne: any) => ligne.produit);
    
              // 7. Charger les produits
              const produits = await manager.findBy(Produit, { id: In(produitsIds) });
    
              // 8. Ajuster le stock
              for (const produit of produits) {
                  const ligne = updateVenteDto.detail_vente.find((l: any) => l.produit === produit.id);
                  if (ligne) {
                      produit.stock_disponible += ligne.quantite; // ou - ligne.quantite selon le mouvement
                  }
              }
              await manager.save(Produit, produits);
          
              return vente;
            });
        } catch (error) {
          throw new InternalServerErrorException(error.message);
        }
  }

  remove(id: number) {
    return `This action removes a #${id} vente`;
  }
}
