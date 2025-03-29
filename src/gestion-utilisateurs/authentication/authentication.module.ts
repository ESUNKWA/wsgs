import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur])
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, JwtService, UtilisateursService, JwtStrategy]
})
export class AuthenticationModule {}