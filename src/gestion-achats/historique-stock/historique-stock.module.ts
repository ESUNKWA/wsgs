import { Module } from '@nestjs/common';
import { HistoriqueStockService } from './historique-stock.service';
import { HistoriqueStockController } from './historique-stock.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [HistoriqueStockController],
  providers: [HistoriqueStockService, ResponseService],
  exports: [HistoriqueStockService],
})
export class HistoriqueStockModule {}
