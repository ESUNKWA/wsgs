import { Injectable } from '@nestjs/common';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { Repository } from 'typeorm';
import { Categorie } from './entities/categorie.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategorieService {

  constructor( 
    @InjectRepository(Categorie)
    private categorieRepository: Repository<Categorie> ){

  }

  async create(createCategorieDto: CreateCategorieDto): Promise<Categorie> {

    try {
        const data = await this.categorieRepository.save(createCategorieDto);
        return data;
    } catch (error) {
      return error.message;
    }
  }

  async findAll(): Promise<Categorie[]> {
     const data = await this.categorieRepository.find() ;
     return data;
  }

  findOne(id: number) {
    return `This action returns a #${id} categorie`;
  }

  update(id: number, updateCategorieDto: UpdateCategorieDto) {
    return `This action updates a #${id} categorie`;
  }

  remove(id: number) {
    return `This action removes a #${id} categorie`;
  }
}
