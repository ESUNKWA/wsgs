import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DevisService } from './devis.service';
import { CreateDevisDto } from './dto/create-devis.dto';
import { UpdateDevisDto } from './dto/update-devis.dto';
import { ResponseService } from 'src/services/response/response.service';
import { StatutDevis } from './entities/devis.entity';

@Controller('devis')
export class DevisController {
  constructor(
    private readonly devisService: DevisService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() createDevisDto: CreateDevisDto) {
    const data = await this.devisService.create(createDevisDto);
    return this.responseService.success('Devis créé avec succès', data);
  }

  @Get()
  async findAll(
    @Query('boutique')   boutique: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin')   date_fin?: string,
    @Query('page')       page?: string,
    @Query('limit')      limit?: string,
  ) {
    const data = await this.devisService.findAll({
      boutique:   +boutique,
      date_debut,
      date_fin,
      page:       page  ? +page  : 1,
      limit:      limit ? +limit : 20,
    });
    return this.responseService.success('Liste des devis', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.devisService.findOne(+id);
    return this.responseService.success('Devis trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDevisDto: UpdateDevisDto) {
    const data = await this.devisService.update(+id, updateDevisDto);
    return this.responseService.success('Devis modifié avec succès', data);
  }

  @Patch(':id/statut')
  async updateStatut(@Param('id') id: string, @Body('statut') statut: StatutDevis) {
    const data = await this.devisService.updateStatut(+id, statut);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Post(':id/convertir-en-vente')
  async convertToVente(@Param('id') id: string) {
    const data = await this.devisService.convertToVente(+id);
    return this.responseService.success('Devis converti en vente avec succès', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.devisService.remove(+id);
    return this.responseService.success('Devis supprimé', data);
  }
}
