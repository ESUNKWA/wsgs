import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import * as bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class AuthenticationService {

  constructor(private utulisateurService: UtilisateursService, private jwtService: JwtService,){}

  async login(createAuthenticationDto: CreateAuthenticationDto): Promise<any> {
   
    const utilisateur: any = await this.utulisateurService.signin(createAuthenticationDto.email);
    
      if (!utilisateur || !(await bcrypt.compare(createAuthenticationDto.mot_de_passe, utilisateur.mot_de_passe))) {
        throw new NotFoundException('Email ou mot de passe incorrect');
      }
      // Supprimer le mot de passe de l'utilisateur avant de renvoyer les données
      delete utilisateur.mot_de_passe;

      if (utilisateur.boutique) {
        utilisateur.boutique.logo = utilisateur.boutique.logo ? `${process.env.BASE_URL}/${utilisateur.boutique.logo}` : null;
      }

      const payload = { userId: utilisateur.id, email: utilisateur.email };

      const access_token = this.jwtService.sign(payload,
      {
        secret: process.env.JWT_SECRET || 'secret',
        expiresIn: process.env.JWT_TOKEN_EXPIRE || '1h',
      } as JwtSignOptions,
    );
      
      return { utilisateur: utilisateur, access_token };
    
  }

  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token expiré ou invalide');
    }
  }

  
}
