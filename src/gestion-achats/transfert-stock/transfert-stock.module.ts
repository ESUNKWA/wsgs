import { Module } from '@nestjs/common';
import { TransfertStockController } from './transfert-stock.controller';
import { TransfertStockService } from './transfert-stock.service';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [TransfertStockController],
  providers: [TransfertStockService, ResponseService],
  exports: [TransfertStockService],
})
export class TransfertStockModule {}
