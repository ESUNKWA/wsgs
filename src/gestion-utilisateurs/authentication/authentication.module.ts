import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { JwtStrategy } from './auth/jwt.strategy';
import { ProfilsService } from '../profils/profils.service';
import { Profil } from '../profils/entities/profil.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, Profil])
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, JwtService, UtilisateursService, JwtStrategy, ProfilsService]
})
export class AuthenticationModule {}