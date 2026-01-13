import { Module } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { UtilisateursController } from './utilisateurs.controller';
import { ResponseService } from 'src/services/response/response.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { ProfilsService } from '../profils/profils.service';
import { Profil } from '../profils/entities/profil.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, Profil])],
  controllers: [UtilisateursController],
  providers: [UtilisateursService, ResponseService, ProfilsService],
})
export class UtilisateursModule {}
