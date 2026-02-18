import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VenteService } from './vente.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { UpdateVenteDto } from './dto/update-vente.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';

@Public()
@Controller('vente')
export class VenteController {
  constructor(private readonly venteService: VenteService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createVenteDto: CreateVenteDto): Promise<DataRequest> {
    const data =  await this.venteService.create(createVenteDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  async findAll(@Query() query: {boutique: number}) {
    const data = await this.venteService.findAll(query);
    return this.responseService.success('Liste des ventes', data);
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
