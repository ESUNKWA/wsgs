import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { Utilisateur } from './entities/utilisateur.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ProfilsService } from '../profils/profils.service';

@Injectable()
export class UtilisateursService {

  constructor( @InjectRepository(Utilisateur) private utilisateurRepository: Repository<Utilisateur>,  private profilService: ProfilsService ){}

  async create(createUtilisateurDto: CreateUtilisateurDto): Promise<any> {
    try {
      const hashPassword = await bcrypt.hash("12345", 10);
      createUtilisateurDto.mot_de_passe = hashPassword;
      //const utilisateur = this.utilisateurRepository.create({ ...createUtilisateurDto, mot_de_passe: hashPassword });
          return await this.utilisateurRepository.save(createUtilisateurDto);
    
        } catch (error) {
          throw new InternalServerErrorException(error.message);
        }
  }

  async createAdminUser(createUtilisateurDto: CreateUtilisateurDto){
    try {

      //Vérifie si l'utilisateur admin existe
      const IsAdminExiste = await this.utilisateurRepository.findOne({where: {is_admin: true}});
     
      if (IsAdminExiste) {
        throw new ConflictException(
          'Utilisateur admin déjà créer [ Nom et prenoms: ' + IsAdminExiste.nom + " " + IsAdminExiste.prenoms + "  Email: " + IsAdminExiste.email + " ]"
        );
      }

      //Récupération du profil admin
      const profil = await this.profilService.findOneByCode('admin');
      
      createUtilisateurDto.mot_de_passe = String(process.env.ADMIN_PASSWORD);
      createUtilisateurDto.profil = profil;
      createUtilisateurDto.is_admin = true;
      
      const hashPassword = await bcrypt.hash(createUtilisateurDto.mot_de_passe, 10);
      createUtilisateurDto.mot_de_passe = hashPassword;
      const user = await this.utilisateurRepository.save(createUtilisateurDto);
      delete (user as any).mot_de_passe;
      return user;
    
    } catch (error) {
          if (error.code === '23505') {
            // Vérifier le message pour savoir quelle contrainte est violée
            if (error.detail.includes('email')) {
              throw new ConflictException('Le mail existe déjà');
            }
            
            throw new ConflictException('Cette donnée existe déjà en base' + error);
          }
          throw new BadRequestException('Erreur interne du serveur ' + error);
    }
  }

  async findAll(profilCode: string, boutique: string): Promise<Utilisateur[]> {
    
    if (profilCode == 'admin') {
      return await this.utilisateurRepository.find({
        order: {nom: 'ASC'}, 
        relations: ['boutique']
      }) ;
    }

    return await this.utilisateurRepository.find({
      where: {boutique: {id: +boutique}},
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
      delete updateUtilisateurDto.mot_de_passe;
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

  async signin(telephone: string): Promise<Utilisateur> {
    try {
      const data = await this.utilisateurRepository.findOne({
        where: {telephone}, 
        relations: ['structure', 'structure.boutique', 'boutique']
      });
      if(!data){
        throw new NotFoundException('Identifiant ou mot de passe incorrecte');
      }
      
      return data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
