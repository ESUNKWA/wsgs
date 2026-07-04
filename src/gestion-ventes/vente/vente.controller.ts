import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VenteService } from './vente.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';

@Controller('vente')
export class VenteController {
  constructor(private readonly venteService: VenteService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createVenteDto: CreateVenteDto): Promise<DataRequest> {
    const data =  await this.venteService.create(createVenteDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  async findAll(
    @Query('boutique') boutique: string,
    @Query('reference') reference?: string,
    @Query('montant') montant?: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin') date_fin?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.venteService.findAll({
      boutique: +boutique,
      reference,
      montant: montant ? +montant : undefined,
      date_debut,
      date_fin,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
    return this.responseService.successPaginated('Liste des ventes', result);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.venteService.findOne(+id);
    return this.responseService.success('vente trouvée', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateVenteDto: UpdateVenteDto) {
    const achat = await this.venteService.update(+id, updateVenteDto);
    return this.responseService.success('Modification effectuée avec succès', achat);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.venteService.remove(+id);
  }
}
