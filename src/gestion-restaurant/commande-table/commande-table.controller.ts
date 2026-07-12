import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CommandeTableService } from './commande-table.service';
import { ResponseService } from 'src/services/response/response.service';
import { StatutCommandeTable } from './entities/commande-table.entity';

@Controller('restaurant/commandes')
export class CommandeTableController {
  constructor(
    private readonly commandeService: CommandeTableService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    const data = await this.commandeService.create(dto);
    return this.responseService.success('Commande créée', data);
  }

  @Get()
  async findAll(
    @Query('boutique') boutique: string,
    @Query('statut') statut?: string,
    @Query('date') date?: string,
  ) {
    const data = await this.commandeService.findAll(+boutique, statut, date);
    return this.responseService.success('Commandes', data);
  }

  @Get('table/:tableId')
  async findByTable(@Param('tableId') tableId: string) {
    const data = await this.commandeService.findByTable(+tableId);
    return this.responseService.success('Commandes table', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.commandeService.findOne(+id);
    return this.responseService.success('Commande', data);
  }

  @Post('encaisser-batch')
  async encaisserBatch(@Body() body: { ids: number[]; liberer_table?: boolean }) {
    const data = await this.commandeService.encaisserBatch(body.ids, body.liberer_table ?? false);
    return this.responseService.success('Commandes encaissées', data);
  }

  @Post(':id/lignes')
  async ajouterLignes(@Param('id') id: string, @Body('lignes') lignes: any[]) {
    const data = await this.commandeService.ajouterLignes(+id, lignes ?? []);
    return this.responseService.success('Lignes ajoutées', data);
  }

  @Patch(':id/statut')
  async changerStatut(@Param('id') id: string, @Body('statut') statut: StatutCommandeTable) {
    const data = await this.commandeService.changerStatut(+id, statut);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Post(':id/encaisser')
  async encaisser(
    @Param('id') id: string,
    @Body('liberer_table') libererTable?: boolean,
  ) {
    const data = await this.commandeService.encaisser(+id, libererTable ?? false);
    return this.responseService.success('Commande encaissée — stock mis à jour', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.commandeService.remove(+id);
    return this.responseService.success('Commande supprimée', data);
  }
}
