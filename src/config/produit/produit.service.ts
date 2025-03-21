import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
      return await data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  findAll() {
    return this.produitRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} produit`;
  }

  update(id: number, updateProduitDto: UpdateProduitDto) {
    return `This action updates a #${id} produit`;
  }

  remove(id: number) {
    return `This action removes a #${id} produit`;
  }
}
