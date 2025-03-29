import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { Repository } from 'typeorm';
import { Categorie } from './entities/categorie.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategorieService {

  constructor( 
    @InjectRepository(Categorie)
    private categorieRepository: Repository<Categorie> ){}

  async create(createCategorieDto: CreateCategorieDto): Promise<Categorie> {
    const data = await this.categorieRepository.save(createCategorieDto);
    return data;
  }

  async findAll(): Promise<Categorie[]> {
     const data = await this.categorieRepository.find({order: {'nom': 'ASC'}}) ;
     return data;
  }

  async findOne(id: number): Promise<Partial<Categorie>> {
    try {
      const categorie = await this.categorieRepository.findOne({where: {
        id: id
      }});

      if (!categorie) {
        throw new NotFoundException('Catégorie inexistante');
      }

      return categorie;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async update(id: number, updateCategorieDto: UpdateCategorieDto): Promise<Partial<Categorie>> {
    
    const categorie = await this.categorieRepository.preload({id, ...updateCategorieDto});
    if (!categorie) {
      throw new NotFoundException('Catégorie inexistante');
    }

    return await this.categorieRepository.save(categorie);
  }

  async remove(id: number) {
    return await this.categorieRepository.softDelete(id);
  }
}
