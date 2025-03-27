import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { Repository } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';

@Injectable()
export class AchatService {

  constructor( 
    @InjectRepository(Achat) private achatRepository: Repository<Achat>,
    @InjectRepository(DetailAchat) private detailAchatRepository: Repository<DetailAchat>
  ){}

  async create(createAchatDto: CreateAchatDto): Promise<Achat> {
    try {
       // Créer un nouvel achat
      const achat = await this.achatRepository.save(createAchatDto);
      // Ajouter les lignes d'achat
      const lignes = createAchatDto.detail_achat.map((ligne: any) => {
        return this.detailAchatRepository.create({
          produit: ligne.produit_id,
          quantite: ligne.quantite,
          prix_achat: ligne.prix_unitaire,
          achat: achat, // Associe chaque ligne à l'achat
        });
      });

      // Insérer toutes les lignes en une seule requête
      await this.detailAchatRepository.save(lignes);

       // Retourner l'achat avec ses lignes
      const achatInsert = await this.achatRepository.findOne({
        where: { id: achat.id },
        relations: ['lignes'],
      });

      return achat;


    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(): Promise<Achat[]>  {
    return await this.achatRepository.find();
  }

  async findOne(id: number): Promise<Achat> {
    const achat = await this.achatRepository.findOne({where: {id: id}});
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return achat;
  }

  async update(id: number, updateAchatDto: UpdateAchatDto): Promise<Achat> {
    const achat = await this.achatRepository.preload({id, ...updateAchatDto});
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return await this.achatRepository.save(achat);
  }

  remove(id: number) {
    return `This action removes a #${id} achat`;
  }
}
