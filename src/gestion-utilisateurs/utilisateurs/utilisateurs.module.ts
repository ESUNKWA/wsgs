import { Module } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { UtilisateursController } from './utilisateurs.controller';
import { ResponseService } from 'src/services/response/response.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './entities/utilisateur.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur])],
  controllers: [UtilisateursController],
  providers: [UtilisateursService, ResponseService],
})
export class UtilisateursModule {}
