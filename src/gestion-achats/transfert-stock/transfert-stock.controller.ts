import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { TransfertStockService } from './transfert-stock.service';
import { ResponseService } from 'src/services/response/response.service';

@Controller('transfert-stock')
export class TransfertStockController {
  constructor(
    private readonly transfertService: TransfertStockService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const telephone = req.user?.telephone ?? body.telephone;
    const data = await this.transfertService.create({ ...body, telephone });
    return this.responseService.success('Transfert créé', data);
  }

  @Get()
  async findAll(@Query() query: any) {
    const result = await this.transfertService.findAll(query);
    return this.responseService.successPaginated('Transferts', result);
  }

  @Get('rapprochement')
  async rapprochement(@Query('source') source: string) {
    const data = await this.transfertService.rapprochement(+source);
    return this.responseService.success('Rapprochement', data);
  }

  @Get('rapport-ventes')
  async rapportVentes(
    @Query('boutique_destination') dest: string,
    @Query('boutique_source') src: string,
    @Query('date_debut') dateDebut: string,
    @Query('date_fin') dateFin: string,
  ) {
    const data = await this.transfertService.rapportVentes({
      boutiqueDestinationId: +dest,
      boutiqueSourceId: src ? +src : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
    });
    return this.responseService.success('Rapport ventes par transferts', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.transfertService.findOne(+id);
    return this.responseService.success('Transfert', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.transfertService.update(+id, body);
    return this.responseService.success('Transfert mis à jour', data);
  }

  @Patch(':id/valider')
  async valider(@Param('id') id: string) {
    const data = await this.transfertService.valider(+id);
    return this.responseService.success('Transfert validé — stock entrepôt débité', data);
  }

  @Patch(':id/recevoir')
  async recevoir(@Param('id') id: string) {
    const data = await this.transfertService.recevoir(+id);
    return this.responseService.success('Transfert réceptionné — stock boutique crédité', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.transfertService.remove(+id);
    return this.responseService.success('Transfert supprimé', null);
  }
}
