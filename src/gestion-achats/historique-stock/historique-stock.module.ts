import { Module } from '@nestjs/common';
import { HistoriqueStockService } from './historique-stock.service';
import { HistoriqueStockController } from './historique-stock.controller';

@Module({
  controllers: [HistoriqueStockController],
  providers: [HistoriqueStockService],
})
export class HistoriqueStockModule {}
