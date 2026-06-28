import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CommandeFournisseurService } from './commande-fournisseur.service';
import { CreateCommandeFournisseurDto } from './dto/create-commande-fournisseur.dto';
import { UpdateCommandeFournisseurDto } from './dto/update-commande-fournisseur.dto';
import { ResponseService } from 'src/services/response/response.service';
import { StatutCommandeFournisseur } from './entities/commande-fournisseur.entity';

@Controller('commande-fournisseur')
export class CommandeFournisseurController {
  constructor(
    private readonly commandeService: CommandeFournisseurService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateCommandeFournisseurDto) {
    const data = await this.commandeService.create(createDto);
    return this.responseService.success('Commande créée avec succès', data);
  }

  @Get()
  async findAll(@Query() query: { boutique: number; page?: number; limit?: number }) {
    const data = await this.commandeService.findAll(query);
    return this.responseService.success('Liste des commandes fournisseur', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.commandeService.findOne(+id);
    return this.responseService.success('Commande trouvée', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateCommandeFournisseurDto) {
    const data = await this.commandeService.update(+id, updateDto);
    return this.responseService.success('Commande modifiée avec succès', data);
  }

  @Patch(':id/statut')
  async updateStatut(@Param('id') id: string, @Body('statut') statut: StatutCommandeFournisseur) {
    const data = await this.commandeService.updateStatut(+id, statut);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Post(':id/recevoir')
  async recevoir(@Param('id') id: string) {
    const data = await this.commandeService.recevoirCommande(+id);
    return this.responseService.success('Commande reçue — achat et stock mis à jour', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.commandeService.remove(+id);
    return this.responseService.success('Commande supprimée', data);
  }
}
