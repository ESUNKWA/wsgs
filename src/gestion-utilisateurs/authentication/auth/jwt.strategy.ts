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
    return {
      userId: payload.userId,
      telephone: payload.telephone ?? null,
      email: payload.email,
      profil: payload.profil,
      structureId: payload.structureId ?? null,
      is_super_admin: payload.is_super_admin ?? false,
    };
  }
  

  /* async validate(payload: any) {
    return { userId: payload.userId, email: payload.email };
  } */
}
