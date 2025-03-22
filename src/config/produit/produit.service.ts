import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Repository } from 'typeorm';
import { Produit } from './entities/produit.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProduitService {

  constructor( 
    @InjectRepository(Produit)
    private produitRepository: Repository<Produit> ){}

  async create(createProduitDto: CreateProduitDto): Promise<Produit> {
    try {
      const data = await this.produitRepository.save(createProduitDto);
      return data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(): Promise<Produit[]> {
    const data = await this.produitRepository.find();
      return data;
  }

  async findOne(id: number): Promise<Produit> {

    const data = await this.produitRepository.findOne({where: {
      id: id
    }});
    
    if(!data){
      throw new NotFoundException('Produit inexistant');
    }
    return data;
    
  }

  async update(id: number, updateProduitDto: UpdateProduitDto) {
    try {
      const produitUpd = await this.produitRepository.preload({id, ...updateProduitDto});
      if(!produitUpd){
        throw new NotFoundException('Produit inexistant');
      }
      return this.produitRepository.save(produitUpd);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }

  }

  remove(id: number) {
    return `This action removes a #${id} produit`;
  }
}
