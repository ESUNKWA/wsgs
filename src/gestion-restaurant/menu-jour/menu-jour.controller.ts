import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MenuJourService } from './menu-jour.service';
import { ResponseService } from 'src/services/response/response.service';

@Controller('restaurant/menus')
export class MenuJourController {
  constructor(
    private readonly menuJourService: MenuJourService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('today')
  async today(@Query('boutique') boutique: string) {
    const data = await this.menuJourService.findToday(+boutique);
    return this.responseService.success('Menu du jour', data);
  }

  @Get()
  async findAll(@Query('boutique') boutique: string) {
    const data = await this.menuJourService.findAll(+boutique);
    return this.responseService.success('Menus', data);
  }

  @Post()
  async create(@Body() dto: { boutique: number; date: string; recettes: number[] }) {
    const data = await this.menuJourService.create(dto);
    return this.responseService.success('Menu créé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body('recettes') recettes: number[]) {
    const data = await this.menuJourService.update(+id, recettes ?? []);
    return this.responseService.success('Menu mis à jour', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.menuJourService.remove(+id);
    return this.responseService.success('Menu supprimé', data);
  }
}
