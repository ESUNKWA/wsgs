import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { Utilisateur } from './entities/utilisateur.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ProfilsService } from '../profils/profils.service';

@Injectable()
export class UtilisateursService {

  constructor(
    @InjectRepository(Utilisateur) private utilisateurRepository: Repository<Utilisateur>,
    private profilService: ProfilsService,
  ) {}

  async create(createUtilisateurDto: CreateUtilisateurDto): Promise<any> {
    try {
      const defaultPwd = process.env.ADMIN_PASSWORD || '12345';
      const rawPassword = createUtilisateurDto.mot_de_passe || defaultPwd;
      const hashPassword = await bcrypt.hash(rawPassword, 10);
      createUtilisateurDto.mot_de_passe = hashPassword;
      return await this.utilisateurRepository.save(createUtilisateurDto);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createAdminUser(createUtilisateurDto: CreateUtilisateurDto) {
    try {
      const IsAdminExiste = await this.utilisateurRepository.findOne({ where: { is_admin: true } });

      if (IsAdminExiste) {
        throw new ConflictException(
          'Utilisateur admin déjà créé [ Nom et prénoms: ' + IsAdminExiste.nom + ' ' + IsAdminExiste.prenoms + '  Email: ' + IsAdminExiste.email + ' ]'
        );
      }

      const profil = await this.profilService.findOneByCode('admin');

      createUtilisateurDto.mot_de_passe = String(process.env.ADMIN_PASSWORD);
      createUtilisateurDto.profil = profil;
      createUtilisateurDto.is_admin = true;

      const hashPassword = await bcrypt.hash(createUtilisateurDto.mot_de_passe, 10);
      createUtilisateurDto.mot_de_passe = hashPassword;
      const user = await this.utilisateurRepository.save(createUtilisateurDto);
      delete (user as any).mot_de_passe;
      return user;

    } catch (error: any) {
      if (error.code === '23505') {
        if (error.detail?.includes('email')) {
          throw new ConflictException('Le mail existe déjà');
        }
        throw new ConflictException('Cette donnée existe déjà en base');
      }
      throw new BadRequestException('Erreur interne du serveur: ' + error.message);
    }
  }

  async findAll(profilCode: string, boutique: string): Promise<Utilisateur[]> {
    if (profilCode === 'admin') {
      return await this.utilisateurRepository.find({
        order: { nom: 'ASC' },
        relations: ['boutique'],
      });
    }
    return await this.utilisateurRepository.find({
      where: { boutique: { id: +boutique } },
      order: { nom: 'ASC' },
      relations: ['boutique'],
    });
  }

  async findOne(id: number): Promise<Utilisateur> {
    const data = await this.utilisateurRepository.findOne({ where: { id } });
    if (!data) {
      throw new NotFoundException('Utilisateur inexistant');
    }
    return data;
  }

  async update(id: number, updateUtilisateurDto: UpdateUtilisateurDto): Promise<Utilisateur> {
    try {
      delete updateUtilisateurDto.mot_de_passe;
      const profil = await this.utilisateurRepository.preload({ id, ...updateUtilisateurDto });
      if (!profil) {
        throw new NotFoundException('Utilisateur inexistant');
      }
      return await this.utilisateurRepository.save(profil);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async changePassword(id: number, ancienMotDePasse: string, nouveauMotDePasse: string): Promise<void> {
    const utilisateur = await this.utilisateurRepository.findOne({ where: { id } });
    if (!utilisateur) {
      throw new NotFoundException('Utilisateur inexistant');
    }
    const valid = await bcrypt.compare(ancienMotDePasse, utilisateur.mot_de_passe);
    if (!valid) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }
    const newHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await this.utilisateurRepository.update(id, { mot_de_passe: newHash });
  }

  async resetPassword(id: number): Promise<void> {
    const defaultPwd = process.env.ADMIN_PASSWORD || '12345';
    const hash = await bcrypt.hash(defaultPwd, 10);
    await this.utilisateurRepository.update(id, { mot_de_passe: hash });
  }

  async remove(id: number) {
    return await this.utilisateurRepository.softDelete(id);
  }

  async signin(telephone: string): Promise<Utilisateur> {
    try {
      const data = await this.utilisateurRepository.findOne({
        where: { telephone },
        relations: ['structure', 'structure.boutique', 'boutique'],
      });
      if (!data) {
        throw new NotFoundException('Identifiant ou mot de passe incorrect');
      }
      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
