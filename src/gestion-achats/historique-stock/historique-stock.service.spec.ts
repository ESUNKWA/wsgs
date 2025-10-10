import { Test, TestingModule } from '@nestjs/testing';
import { HistoriqueStockService } from './historique-stock.service';

describe('HistoriqueStockService', () => {
  let service: HistoriqueStockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoriqueStockService],
    }).compile();

    service = module.get<HistoriqueStockService>(HistoriqueStockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
