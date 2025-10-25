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

  async findByBoutique(id: number): Promise<Fournisseur[]> {
    return await this.fournisseurRepository.find({where:{boutique: {id}}, order: {nom: 'ASC'}});
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
