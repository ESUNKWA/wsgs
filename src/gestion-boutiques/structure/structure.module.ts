import { Module } from '@nestjs/common';
import { StructureService } from './structure.service';
import { StructureController } from './structure.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Structure } from './entities/structure.entity';
import { ResponseService } from 'src/services/response/response.service';
import { UtilisateursService } from 'src/gestion-utilisateurs/utilisateurs/utilisateurs.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { ProfilsService } from 'src/gestion-utilisateurs/profils/profils.service';
import { Profil } from 'src/gestion-utilisateurs/profils/entities/profil.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Structure, Utilisateur, Profil])],
  controllers: [StructureController],
  providers: [StructureService, ResponseService, UtilisateursService, ProfilsService],
})
export class StructureModule {}
