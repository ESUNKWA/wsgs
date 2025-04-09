import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DetailVenteService } from './detail-vente.service';
import { CreateDetailVenteDto } from './dto/create-detail-vente.dto';
import { UpdateDetailVenteDto } from './dto/update-detail-vente.dto';

@Controller('detail-vente')
export class DetailVenteController {
  constructor(private readonly detailVenteService: DetailVenteService) {}

  @Post()
  create(@Body() createDetailVenteDto: CreateDetailVenteDto) {
    return this.detailVenteService.create(createDetailVenteDto);
  }

  @Get()
  findAll() {
    return this.detailVenteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detailVenteService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDetailVenteDto: UpdateDetailVenteDto) {
    return this.detailVenteService.update(+id, updateDetailVenteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detailVenteService.remove(+id);
  }
}
