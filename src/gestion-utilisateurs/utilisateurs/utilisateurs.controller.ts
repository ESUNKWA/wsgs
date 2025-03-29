import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';

@Controller('utilisateur')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createUtilisateurDto: CreateUtilisateurDto): Promise<DataRequest> {
    const data = await this.utilisateursService.create(createUtilisateurDto);
    return this.responseService.success('Enregistrement effectués avec succès', data);
  }

  @Get()
  async findAll(): Promise<DataRequest> {
    const data = await this.utilisateursService.findAll();
    return this.responseService.success('Liste des utilisateurs', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.utilisateursService.findOne(+id);
    return this.responseService.success('Utilisateur trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUtilisateurDto: UpdateUtilisateurDto): Promise<DataRequest> {
    const data = await this.utilisateursService.update(+id, updateUtilisateurDto);
    return this.responseService.success('Modification effectués avec succès', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.utilisateursService.remove(+id);
  }
}
