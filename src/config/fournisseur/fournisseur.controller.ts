import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FournisseurService } from './fournisseur.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { AuthGuard } from '@nestjs/passport';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('fournisseur')
export class FournisseurController {
  constructor(private readonly fournisseurService: FournisseurService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createFournisseurDto: CreateFournisseurDto): Promise<DataRequest> {
    const data = await this.fournisseurService.create(createFournisseurDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  async findAll(): Promise<DataRequest> {
    const data = await this.fournisseurService.findAll();
    return this.responseService.success('Liste des fournisseurs', data);
  }

  @Get('boutique')
  async findByBoutique(@Query('boutiqueId') boutique: number): Promise<DataRequest> {
    const data = await this.fournisseurService.findByBoutique(boutique);
    return this.responseService.success('Liste des fournisseurs', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.fournisseurService.findOne(+id);
    return this.responseService.success('Fournisseur trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFournisseurDto: UpdateFournisseurDto): Promise<DataRequest> {
    const data = await this.fournisseurService.update(+id, updateFournisseurDto);
    return this.responseService.success('Modification effectuée avec succès', data);

  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fournisseurService.remove(+id);
  }
}
