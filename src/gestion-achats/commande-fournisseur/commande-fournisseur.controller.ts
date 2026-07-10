import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res } from '@nestjs/common';
import { Response } from 'express';
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
  async recevoir(
    @Param('id') id: string,
    @Body('lignes') lignes: { detail_id: number; quantite_recue: number }[],
  ) {
    const data = await this.commandeService.recevoirCommande(+id, lignes ?? []);
    return this.responseService.success('Commande reçue — achat et stock mis à jour', data);
  }

  @Get(':id/pdf')
  async bonCommande(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.commandeService.generateBonCommande(+id);
    (res as any).set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bon-commande-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    (res as any).end(buffer);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.commandeService.remove(+id);
    return this.responseService.success('Commande supprimée', data);
  }
}
