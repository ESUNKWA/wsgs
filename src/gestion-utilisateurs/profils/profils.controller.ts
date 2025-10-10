import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProfilsService } from './profils.service';
import { CreateProfilDto } from './dto/create-profil.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('profil')
export class ProfilsController {
  constructor(private readonly profilsService: ProfilsService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createProfilDto: CreateProfilDto): Promise<DataRequest> {
    const data = await this.profilsService.create(createProfilDto);
    return this.responseService.success('Enregistrement effectués avec succès', data);

  }

  @Get()
  async findAll(): Promise<DataRequest> {
    const data = await this.profilsService.findAll();
    return this.responseService.success('Liste des profils', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.profilsService.findOne(+id);
    return this.responseService.success('Profil trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProfilDto: UpdateProfilDto): Promise<DataRequest> {
    const data = await this.profilsService.update(+id, updateProfilDto);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profilsService.remove(+id);
  }
}
