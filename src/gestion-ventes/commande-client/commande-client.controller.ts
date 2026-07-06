import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CommandeClientService } from './commande-client.service';
import { CreateCommandeClientDto } from './dto/create-commande-client.dto';
import { UpdateCommandeClientDto } from './dto/update-commande-client.dto';
import { ResponseService } from 'src/services/response/response.service';
import { StatutCommandeClient } from './entities/commande-client.entity';

@Controller('commande-client')
export class CommandeClientController {
  constructor(
    private readonly commandeService: CommandeClientService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateCommandeClientDto) {
    const data = await this.commandeService.create(createDto);
    return this.responseService.success('Commande créée avec succès', data);
  }

  @Get()
  async findAll(
    @Query('boutique')   boutique: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin')   date_fin?: string,
    @Query('page')       page?: string,
    @Query('limit')      limit?: string,
  ) {
    const data = await this.commandeService.findAll({
      boutique:   +boutique,
      date_debut,
      date_fin,
      page:       page  ? +page  : 1,
      limit:      limit ? +limit : 20,
    });
    return this.responseService.success('Liste des commandes client', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.commandeService.findOne(+id);
    return this.responseService.success('Commande trouvée', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateCommandeClientDto) {
    const data = await this.commandeService.update(+id, updateDto);
    return this.responseService.success('Commande modifiée avec succès', data);
  }

  @Patch(':id/statut')
  async updateStatut(@Param('id') id: string, @Body('statut') statut: StatutCommandeClient) {
    const data = await this.commandeService.updateStatut(+id, statut);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Post(':id/livrer')
  async livrer(@Param('id') id: string) {
    const data = await this.commandeService.confirmerLivraison(+id);
    return this.responseService.success('Commande livrée — vente et stock mis à jour', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.commandeService.remove(+id);
    return this.responseService.success('Commande supprimée', data);
  }
}
