import { Test, TestingModule } from '@nestjs/testing';
import { HistoriqueStockController } from './historique-stock.controller';
import { HistoriqueStockService } from './historique-stock.service';

describe('HistoriqueStockController', () => {
  let controller: HistoriqueStockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoriqueStockController],
      providers: [HistoriqueStockService],
    }).compile();

    controller = module.get<HistoriqueStockController>(HistoriqueStockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
