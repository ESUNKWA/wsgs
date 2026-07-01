import { Controller, Get, Query } from '@nestjs/common';
import { PrevisionService } from './prevision.service';
import { ResponseService } from 'src/services/response/response.service';

@Controller('prevision')
export class PrevisionController {
  constructor(
    private readonly previsionService: PrevisionService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /prevision/rupture?boutique=1&jours=30
   *
   * Retourne la prévision de rupture de stock pour chaque produit de la boutique.
   * - jours (optionnel, défaut 30) : fenêtre d'analyse pour calculer la consommation
   *
   * Statuts retournés :
   *   critique  → rupture dans ≤ 3 jours
   *   alerte    → rupture dans ≤ 7 jours
   *   attention → rupture dans ≤ 14 jours
   *   ok        → stock suffisant
   *   inactif   → aucune vente sur la période
   */
  @Get('rupture')
  async getRuptureStock(
    @Query('boutique') boutique: string,
    @Query('jours') jours?: string,
  ) {
    const data = await this.previsionService.getPrevisionRupture(
      +boutique,
      jours ? Math.min(Math.max(+jours, 7), 90) : 30,
    );
    return this.responseService.success('Prévision de rupture de stock', data);
  }
}
