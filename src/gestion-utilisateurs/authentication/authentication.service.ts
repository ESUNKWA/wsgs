import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import * as bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class AuthenticationService {

  constructor(private utulisateurService: UtilisateursService, private jwtService: JwtService,){}

  async login(createAuthenticationDto: CreateAuthenticationDto): Promise<any> {
   
    const utilisateur: any = await this.utulisateurService.signin(createAuthenticationDto.telephone);
    
      if (!utilisateur || !(await bcrypt.compare(createAuthenticationDto.mot_de_passe, utilisateur.mot_de_passe))) {
        throw new NotFoundException('Identifiant ou mot de passe incorrect');
      }
      // Supprimer le mot de passe de l'utilisateur avant de renvoyer les données
      delete utilisateur.mot_de_passe;

      const isResponsableStructure = utilisateur.profil?.code === 'responsable_structure';

      if (utilisateur.boutique) {
        utilisateur.boutique.logo = utilisateur.boutique.logo
          ? `${process.env.BASE_URL}/${utilisateur.boutique.logo}`
          : null;
      }

      // Pour le responsable structure : exposer toutes ses boutiques avec logo résolu
      let boutiques: any[] = [];
      if (isResponsableStructure && utilisateur.structure?.length) {
        boutiques = utilisateur.structure.flatMap((s: any) =>
          (s.boutique ?? []).map((b: any) => ({
            ...b,
            logo: b.logo ? `${process.env.BASE_URL}/${b.logo}` : null,
            structure: { id: s.id, nom: s.nom },
          }))
        );
      }

      const payload = { userId: utilisateur.id, email: utilisateur.email, profil: utilisateur.profil?.code };

      const access_token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'secret',
        expiresIn: process.env.JWT_TOKEN_EXPIRE || '1h',
      } as JwtSignOptions);

      return {
        utilisateur: {
          ...utilisateur,
          ...(isResponsableStructure ? { boutiques } : {}),
        },
        access_token,
      };
    
  }

  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token expiré ou invalide');
    }
  }

  
}
