import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { DataSource, Repository } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';

@Injectable()
export class AchatService {

  data: any;

  constructor( 
    private readonly dataSource: DataSource,
    @InjectRepository(Achat) private achatRepository: Repository<Achat>,
    @InjectRepository(DetailAchat) private detailAchatRepository: Repository<DetailAchat>,
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

          return achat;

        });
        //return await this.data;


    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(): Promise<Achat[]>  {
    return await this.achatRepository.find();
  }

  async findOne(id: number): Promise<Achat> {
    const achat = await this.achatRepository.findOne({where: {id: id}, relations: ['detail_achat'] });
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return achat;
  }

  async update(id: number, updateAchatDto: any): Promise<any> {
    try {
        return await this.dataSource.transaction(async (manager) => {

          // 1. Charger l'achat existant
          //const achat = await manager.findOne(Achat, { where: { id }, relations: ['detail_achat'] });
          const achat = await manager.preload(Achat, { id, ...updateAchatDto });

         
          if (!achat) {
            throw new Error('Achat introuvable');
          }

          
         
          // 3. Supprimer les anciennes lignes (si c'est ce que tu veux)
          await manager.delete(DetailAchat, { achat: achat.id });

          
      
          // 4. Insérer les nouvelles lignes
          const lignes: DetailAchat[] = updateAchatDto.detail_achat.map((ligne: any) => {
            const l = new DetailAchat();
            l.produit = ligne.produit;
            l.quantite = ligne.quantite;
            l.prix_unitaire = ligne.prix_unitaire;
            l.achat = achat;
            return l;
          });
          
          // 5. Sauvegarder l'achat modifié
          await manager.save(Achat, achat);
          
          await manager.save(DetailAchat, lignes);
      
          
        });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    
    }
  }

  remove(id: number) {
    return `This action removes a #${id} achat`;
  }
}
