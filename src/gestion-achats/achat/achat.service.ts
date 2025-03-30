import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { DataSource, In, Repository } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { HistoriqueStock } from '../historique-stock/entities/historique-stock.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';

@Injectable()
export class AchatService {

  constructor( 
    private readonly dataSource: DataSource,
    @InjectRepository(Achat) private achatRepository: Repository<Achat>,
    @InjectRepository(DetailAchat) private detailAchatRepository: Repository<DetailAchat>,
    @InjectRepository(HistoriqueStock) private historiqueStockRepository: Repository<HistoriqueStock>
    
  ){}

  async create(createAchatDto: CreateAchatDto): Promise<Achat> {
    try {

      return await this.dataSource.transaction(async (manager)=>{
          // Créer un nouvel achat
          createAchatDto.reference = ReferenceGeneratorHelper.generate('ACH'); // utilisation du helper
          const achat = manager.create(Achat, createAchatDto);

          // Sauvegarder l'achat
          const achatSauvegarde = await manager.save(achat);
          
          // Ajouter les lignes d'achat
          const lignes = createAchatDto.detail_achat.map((ligne: any) => {
            return manager.create(DetailAchat, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              prix_unitaire: ligne.prix_unitaire,
              achat: achat, // Associe chaque ligne à l'achat
            });
          });
          
          // Insérer toutes les lignes en une seule requête
          await manager.save(lignes);


          // Ajouter les lignes d'historisation des stocks
          const lignesHistorik = createAchatDto.detail_achat.map((ligne: any) => {
            return manager.create(HistoriqueStock, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              mouvement: 'entree',
              source: 'achat',
              achat: achat, // Associe chaque ligne à l'achat
            });
          });
          
          // Insérer toutes les lignes en une seule requête
          await manager.save(lignesHistorik);

          
          // 1. Extraire les ids
          const produitsIds = createAchatDto.detail_achat.map((ligne: any) => ligne.produit);

          // 2. Charger les produits
          const produits = await manager.findBy(Produit, { id: In(produitsIds) });

          // 3. Ajuster le stock
          for (const produit of produits) {
              const ligne = createAchatDto.detail_achat.find((l: any) => l.produit === produit.id);
              if (ligne) {
                  produit.stock_disponible += ligne.quantite; // ou - ligne.quantite selon le mouvement
              }
          }
          await manager.save(Produit, produits);


          return achat;

        });
        //return await this.data;


    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(body: {boutique: number}): Promise<Achat[]>  {
    if (isNaN(body.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    return await this.achatRepository.find({where: {boutique: {id: body.boutique}}, order: {'created_at': 'DESC'}});
  }

  async findOne(id: number): Promise<Achat> {
    const achat = await this.achatRepository.findOne({where: {id: id}, relations: ['detail_achat'] });
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return achat;
  }

  async update(id: number, updateAchatDto: any): Promise<Achat> {
    try {
        return await this.dataSource.transaction(async (manager) => {

          // 1. Charger l'achat existant
          //const achat = await manager.findOne(Achat, { where: { id }, relations: ['detail_achat'] });
          const achat = await manager.preload(Achat, {id, ...updateAchatDto });
         
          if (!achat) {
            throw new Error('Achat introuvable');
          }
          
          // 2. Supprimer les anciennes lignes (si c'est ce que tu veux)
          await manager.delete(DetailAchat, { achat: achat.id });        
      
          // .3 Insérer les nouvelles lignes
          const lignes: DetailAchat[] = updateAchatDto.detail_achat.map((ligne: any) => {
            const l = new DetailAchat();
            l.produit = ligne.produit;
            l.quantite = ligne.quantite;
            l.prix_unitaire = ligne.prix_unitaire;
            l.achat = achat;
            return l;
          });
          
          // 4. Sauvegarder l'achat modifié
          await manager.save(Achat, achat);
          
          await manager.save(DetailAchat, lignes);

           // 5. Supprimer les anciennes lignes d'historisation (si c'est ce que tu veux)
           await manager.delete(HistoriqueStock, { achat: achat.id }); 

          // Ajouter les lignes d'historisation des stocks
          const lignesHistorik = updateAchatDto.detail_achat.map((ligne: any) => {
            return manager.create(HistoriqueStock, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              mouvement: 'entree',
              source: 'achat',
              achat: achat, // Associe chaque ligne à l'achat
            });
          });
          
          // Insérer toutes les lignes en une seule requête
          await manager.save(lignesHistorik);

          // 6. Extraire les ids
          const produitsIds = updateAchatDto.detail_achat.map((ligne: any) => ligne.produit);

          // 7. Charger les produits
          const produits = await manager.findBy(Produit, { id: In(produitsIds) });

          // 8. Ajuster le stock
          for (const produit of produits) {
              const ligne = updateAchatDto.detail_achat.find((l: any) => l.produit === produit.id);
              if (ligne) {
                  produit.stock_disponible += ligne.quantite; // ou - ligne.quantite selon le mouvement
              }
          }
          await manager.save(Produit, produits);
      
          return achat;
        });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} achat`;
  }
}
