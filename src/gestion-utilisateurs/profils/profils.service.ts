import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProfilDto } from './dto/create-profil.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Profil } from './entities/profil.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProfilsService {

  constructor( @InjectRepository(Profil) private profilRepository: Repository<Profil> ){}

  async create(createProfilDto: CreateProfilDto): Promise<Profil> {
    
    try {
      
      return await this.profilRepository.save(createProfilDto);

    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(): Promise<Profil[]> {
    return await this.profilRepository.find({order: {nom: 'ASC'}}) ;
  }

  async findOne(id: number): Promise<Profil> {
    const profil = await this.profilRepository.findOne({where: {id: id}});
    if(!profil){
      throw new NotFoundException('Profil inexistant');
    }

    return profil;
  }

  async findOneByCode(code: string): Promise<Profil> {
    const profil = await this.profilRepository.findOne({where: {code: code}});
    if(!profil){
      throw new NotFoundException('Profil inexistant');
    }

    return profil;
  }

  async update(id: number, updateProfilDto: UpdateProfilDto) {
    try {
      const profil = await this.profilRepository.preload({id, ...updateProfilDto});
      if(!profil){
        throw new NotFoundException('Profil inexistant');
      }
      return await this.profilRepository.save(profil)
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    return await this.profilRepository.softDelete(id);
  }
}
