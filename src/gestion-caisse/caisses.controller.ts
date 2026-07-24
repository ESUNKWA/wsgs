import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ResponseService } from 'src/services/response/response.service';
import { CaissesService } from './caisses.service';
import { CreateCaisseDto, UpdateCaisseDto } from './dto/create-caisse.dto';

@Controller('caisses')
export class CaissesController {
  constructor(
    private readonly caissesService: CaissesService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  async findAll(@Query('boutique') boutique: string) {
    const data = await this.caissesService.findAll(+boutique);
    return this.responseService.success('', data);
  }

  @Post()
  async create(@Body() dto: CreateCaisseDto) {
    const data = await this.caissesService.create(dto);
    return this.responseService.success('Caisse créée avec succès', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCaisseDto) {
    const data = await this.caissesService.update(+id, dto);
    return this.responseService.success('Caisse mise à jour', data);
  }

  @Post(':id/toggle-statut')
  async toggleStatut(@Param('id') id: string) {
    const data = await this.caissesService.toggleStatut(+id);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.caissesService.remove(+id);
    return this.responseService.success('Caisse supprimée', null);
  }

  @Post('migrer')
  async migrer(@Query('boutique') boutique: string) {
    const data = await this.caissesService.migrer(+boutique);
    return this.responseService.success(data.message, data);
  }
}
