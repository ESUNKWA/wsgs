import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { Utilisateur } from './entities/utilisateur.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {

  constructor( @InjectRepository(Utilisateur) private utilisateurRepository: Repository<Utilisateur> ){}

  async create(createUtilisateurDto: CreateUtilisateurDto): Promise<any> {
    try {
      const hashPassword = await bcrypt.hash(createUtilisateurDto.mot_de_passe, 10);
      createUtilisateurDto.mot_de_passe = hashPassword;
      //const utilisateur = this.utilisateurRepository.create({ ...createUtilisateurDto, mot_de_passe: hashPassword });
          return await this.utilisateurRepository.save(createUtilisateurDto);
    
        } catch (error) {
          throw new InternalServerErrorException(error.message);
        }
  }

  async findAll(): Promise<Utilisateur[]> {
    return await this.utilisateurRepository.find({
      order: {nom: 'ASC'}, 
      relations: ['boutique']
    }) ;
  }

  async findOne(id: number): Promise<Utilisateur> {
    const data = await this.utilisateurRepository.findOne({where: {id: id}});
        if(!data){
          throw new NotFoundException('Utilisateur inexistant');
        }
    
        return data;
  }

  async update(id: number, updateUtilisateurDto: UpdateUtilisateurDto): Promise<Utilisateur> {
    try {
      const profil = await this.utilisateurRepository.preload({id, ...updateUtilisateurDto});
      if(!profil){
        throw new NotFoundException('Utilisateur inexistant');
      }
      return await this.utilisateurRepository.save(profil)
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    return await this.utilisateurRepository.softDelete(id);
  }

  async signin(email: string): Promise<Utilisateur> {
    try {
      const data = await this.utilisateurRepository.findOne({
        where: {email}, 
        relations: ['structure', 'structure.boutique', 'boutique']
      });
      if(!data){
        throw new NotFoundException('Email ou mot de passe incorrecte');
      }
      
      return data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
