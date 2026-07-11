import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { PublicMenuService } from './public-menu.service';

@Public()
@Controller('public')
export class PublicMenuController {
  constructor(private readonly publicMenuService: PublicMenuService) {}

  /** Retourne le menu du jour + tables pour l'affichage client */
  @Get('menu')
  async getMenu(@Query('boutique') boutique: string) {
    return this.publicMenuService.getMenu(+boutique);
  }

  /** Client passe une commande via QR */
  @Post('commande')
  async passerCommande(@Body() dto: {
    boutique: number;
    telephone: string;
    table?: number;
    lignes: { recette: number; quantite: number; prix_unitaire: number; note?: string }[];
  }) {
    return this.publicMenuService.passerCommande(dto);
  }

  /** Client appelle un serveur */
  @Post('appel-serveur')
  async appelServeur(@Body('boutique') boutique: number, @Body('table') table?: number) {
    return this.publicMenuService.appelServeur(+boutique, table ? +table : undefined);
  }

  /** Personnel acquitte un appel serveur */
  @Patch('appel-serveur/:tableId/acquitter')
  async acquitter(@Param('tableId') tableId: string) {
    return this.publicMenuService.acquitterAppel(+tableId);
  }
}
