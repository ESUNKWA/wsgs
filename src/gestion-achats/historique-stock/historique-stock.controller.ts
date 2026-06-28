import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoriqueStockService } from './historique-stock.service';
import { ResponseService } from 'src/services/response/response.service';

@Controller('mouvement-stock')
export class HistoriqueStockController {
  constructor(
    private readonly historiqueStockService: HistoriqueStockService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  async findAll(
    @Query() query: { boutique?: number; produit?: number; page?: number; limit?: number },
  ) {
    const result = await this.historiqueStockService.findAll(query);
    return this.responseService.successPaginated('Historique des mouvements de stock', result);
  }

  @Get('produit/:id')
  async findByProduit(@Param('id') id: string) {
    const data = await this.historiqueStockService.findByProduit(+id);
    return this.responseService.success('Mouvements du produit', data);
  }
}
