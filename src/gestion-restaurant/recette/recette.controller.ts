import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RecetteService } from './recette.service';
import { ResponseService } from 'src/services/response/response.service';

@Controller('restaurant/recettes')
export class RecetteController {
  constructor(
    private readonly recetteService: RecetteService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    const data = await this.recetteService.create(dto);
    return this.responseService.success('Recette créée', data);
  }

  @Get()
  async findAll(@Query('boutique') boutique: string, @Query('categorie') categorie?: string) {
    const data = await this.recetteService.findAll(+boutique, categorie);
    return this.responseService.success('Recettes', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.recetteService.findOne(+id);
    return this.responseService.success('Recette', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const data = await this.recetteService.update(+id, dto);
    return this.responseService.success('Recette modifiée', data);
  }

  @Post('import-stock')
  async importDepuisStock(
    @Body('boutique') boutique: string,
    @Body('items') items: { produit_id: number; nom: string; prix_vente: number; categorie: string }[],
  ) {
    const data = await this.recetteService.importDepuisStock(+boutique, items ?? []);
    return this.responseService.success(`${data.created} recette(s) créée(s), ${data.skipped} ignorée(s) (doublon)`, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.recetteService.remove(+id);
    return this.responseService.success('Recette supprimée', data);
  }
}
