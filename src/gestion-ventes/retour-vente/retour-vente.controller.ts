import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RetourVenteService } from './retour-vente.service';
import { CreateRetourVenteDto } from './dto/create-retour-vente.dto';
import { ResponseService } from 'src/services/response/response.service';

@Controller('retour-vente')
export class RetourVenteController {
  constructor(
    private readonly retourVenteService: RetourVenteService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async creerRetour(@Body() dto: CreateRetourVenteDto) {
    const data = await this.retourVenteService.creerRetour(dto);
    return this.responseService.success('Retour enregistré avec succès', data);
  }

  @Get()
  async findAll(
    @Query('boutique') boutique: string,
    @Query('reference') reference?: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin') date_fin?: string,
    @Query('montant') montant?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.retourVenteService.findAll({
      boutiqueId: +boutique,
      reference,
      date_debut,
      date_fin,
      montant: montant ? +montant : undefined,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
    return this.responseService.success('Liste des retours', data);
  }

  @Get('vente/:venteId')
  async findByVente(@Param('venteId') venteId: string) {
    const data = await this.retourVenteService.findByVente(+venteId);
    return this.responseService.success('Retours de la vente', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.retourVenteService.findOne(+id);
    return this.responseService.success('Détail retour', data);
  }

  @Patch(':id/annuler')
  async annuler(@Param('id') id: string) {
    const data = await this.retourVenteService.annuler(+id);
    return this.responseService.success('Retour annulé', data);
  }
}
