import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SessionCaisseService } from './session-caisse.service';
import { ResponseService } from 'src/services/response/response.service';
import { OuvrirCaisseDto } from './dto/ouvrir-caisse.dto';
import { FermerCaisseDto } from './dto/fermer-caisse.dto';
import { MouvementCaisseDto } from './dto/mouvement-caisse.dto';

@Controller('caisse')
export class SessionCaisseController {
  constructor(
    private readonly sessionCaisseService: SessionCaisseService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('ouvrir')
  async ouvrir(@Body() dto: OuvrirCaisseDto) {
    const data = await this.sessionCaisseService.ouvrir(dto);
    return this.responseService.success('Session de caisse ouverte', data);
  }

  @Post(':id/fermer')
  async fermer(
    @Param('id') id: string,
    @Body() dto: FermerCaisseDto,
    @Query('caissier') caissier?: string,
  ) {
    const data = await this.sessionCaisseService.fermer(+id, dto, caissier ?? undefined);
    return this.responseService.success('Session de caisse fermée', data);
  }

  @Post(':id/mouvement')
  async ajouterMouvement(@Param('id') id: string, @Body() dto: MouvementCaisseDto) {
    const data = await this.sessionCaisseService.ajouterMouvement(+id, dto);
    return this.responseService.success('Mouvement enregistré', data);
  }

  @Get('active')
  async getActive(
    @Query('boutique') boutique: string,
    @Query('caissier') caissier?: string,
  ) {
    const data = await this.sessionCaisseService.getSessionActive(+boutique, caissier ?? undefined);
    return this.responseService.success('Session active', data);
  }

  @Get(':id/theorique')
  async getMontantTheorique(@Param('id') id: string) {
    const data = await this.sessionCaisseService.getMontantTheorique(+id);
    return this.responseService.success('Montant théorique de la session', data);
  }

  @Get(':id/rapport')
  async getRapport(@Param('id') id: string) {
    const data = await this.sessionCaisseService.getRapport(+id);
    return this.responseService.success('Rapport de caisse', data);
  }

  @Get()
  async findAll(@Query() query: { boutique: number; page?: number; limit?: number }) {
    const result = await this.sessionCaisseService.findAll(query);
    return this.responseService.successPaginated('Sessions de caisse', result);
  }
}
