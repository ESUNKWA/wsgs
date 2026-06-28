import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { Repository } from 'typeorm';
import { Fournisseur } from './entities/fournisseur.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@Injectable()
export class FournisseurService {

  constructor( 
    @InjectRepository(Fournisseur) 
    private fournisseurRepository: Repository<Fournisseur>
  ){}

  async create(createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    try {
      return await this.fournisseurRepository.save(createFournisseurDto) ;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(): Promise<Fournisseur[]> {
    return await this.fournisseurRepository.find({order: {nom: 'ASC'}});
  }

  async findByBoutique(id: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.fournisseurRepository.findAndCount({
      where: { boutique: { id } },
      order: { nom: 'ASC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({where: {id: id}});
    if (!fournisseur) {
      throw new NotFoundException('Fournisseur inexistant');
    }

    return fournisseur;
  }

  async update(id: number, updateFournisseurDto: UpdateFournisseurDto): Promise<Fournisseur> {
    try {
      const fournisseur = await this.fournisseurRepository.preload({id, ...updateFournisseurDto});
      if (!fournisseur) {
        throw new NotFoundException('Fournisseur inexistant');
      }

      return await this.fournisseurRepository.save(fournisseur);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
   
  }

  async remove(id: number) {
    return await this.fournisseurRepository.softDelete(id);
  }
}
