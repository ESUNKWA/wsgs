import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { BonSortieService } from './bon-sortie.service';
import { CreateBonSortieDto } from './dto/create-bon-sortie.dto';
import { ResponseService } from 'src/services/response/response.service';

@Controller('bon-sortie')
export class BonSortieController {
  constructor(
    private readonly bonSortieService: BonSortieService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateBonSortieDto) {
    const data = await this.bonSortieService.create(dto);
    return this.responseService.success('Bon de sortie créé avec succès', data);
  }

  @Get('boutique')
  async findByBoutique(
    @Query('boutiqueId', new ParseIntPipe({ errorHttpStatusCode: 400 })) boutiqueId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.bonSortieService.findByBoutique(boutiqueId, Number(page) || 1, Number(limit) || 20);
    return this.responseService.successPaginated('Liste des bons de sortie', result);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.bonSortieService.findOne(id);
    return this.responseService.success('Bon de sortie', data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bonSortieService.remove(id);
    return this.responseService.success('Bon de sortie supprimé', null);
  }
}
