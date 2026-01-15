import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private jwtService: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "secret", // 🔴 Mettre une variable d'environnement en production
    });
  }

  async validate(payload: any) {
    try {
      // On peut directement retourner le payload, il contient déjà les données nécessaires
      return { userId: payload.userId, email: payload.email };
    } catch (error) {
      console.error('Erreur de validation du token:', error.message);  // Log d'erreur
      throw new UnauthorizedException('Token expiré ou invalide');
    }
  }
  

  /* async validate(payload: any) {
    return { userId: payload.userId, email: payload.email };
  } */
}
