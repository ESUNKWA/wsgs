import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriqueStockService } from './historique-stock.service';
import { HistoriqueStockController } from './historique-stock.controller';
import { HistoriqueStock } from './entities/historique-stock.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [TypeOrmModule.forFeature([HistoriqueStock])],
  controllers: [HistoriqueStockController],
  providers: [HistoriqueStockService, ResponseService],
  exports: [HistoriqueStockService],
})
export class HistoriqueStockModule {}
