import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbonnementService } from '../abonnement.service';

const MESSAGES: Record<string, string> = {
  expire:     "Votre abonnement a expiré. Contactez votre administrateur pour renouveler.",
  suspendu:   "Votre accès a été suspendu. Contactez votre administrateur.",
  aucun:      "Aucun abonnement actif pour cette structure. Contactez votre administrateur.",
  en_attente: "Votre demande de souscription est en attente de validation par l'administrateur.",
};

@Injectable()
export class AbonnementGuard implements CanActivate {
  constructor(
    private readonly abonnementService: AbonnementService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Routes publiques → pas de vérification
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // JwtAuthGuard gère l'absence de token

    // Super_admin → accès total
    if (user.is_super_admin || user.profil === 'super_admin') return true;

    // Pas de structure associée → pas de vérification (ex: utilisateurs sans tenant)
    if (!user.structureId) return true;

    const statut = await this.abonnementService.checkStatut(user.structureId);
    if (statut === 'actif') return true;

    throw new ForbiddenException(MESSAGES[statut] ?? 'Accès refusé.');
  }
}
