import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HistoriqueStockService } from './historique-stock.service';
import { CreateHistoriqueStockDto } from './dto/create-historique-stock.dto';
import { UpdateHistoriqueStockDto } from './dto/update-historique-stock.dto';

@Controller('historique-stock')
export class HistoriqueStockController {
  constructor(private readonly historiqueStockService: HistoriqueStockService) {}

  @Post()
  create(@Body() createHistoriqueStockDto: CreateHistoriqueStockDto) {
    return this.historiqueStockService.create(createHistoriqueStockDto);
  }

  @Get()
  findAll() {
    return this.historiqueStockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.historiqueStockService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHistoriqueStockDto: UpdateHistoriqueStockDto) {
    return this.historiqueStockService.update(+id, updateHistoriqueStockDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.historiqueStockService.remove(+id);
  }
}
