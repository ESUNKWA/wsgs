import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
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

  @Post('admin')
  async createAdminUser(@Body() createUtilisateurDto: CreateUtilisateurDto): Promise<DataRequest> {
    const data = await this.utilisateursService.createAdminUser(createUtilisateurDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  async findAll(@Query('profil') profil: string, @Query('boutique') boutique: string): Promise<DataRequest> {
    const data = await this.utilisateursService.findAll(profil, boutique);
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

  @Patch(':id/mot-de-passe')
  async changePassword(
    @Param('id') id: string,
    @Body() body: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string },
  ): Promise<DataRequest> {
    await this.utilisateursService.changePassword(+id, body.ancien_mot_de_passe, body.nouveau_mot_de_passe);
    return this.responseService.success('Mot de passe modifié avec succès', null);
  }

  @Patch(':id/reset-mot-de-passe')
  async resetPassword(@Param('id') id: string): Promise<DataRequest> {
    await this.utilisateursService.resetPassword(+id);
    return this.responseService.success('Mot de passe réinitialisé avec succès', null);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.utilisateursService.remove(+id);
  }
}
