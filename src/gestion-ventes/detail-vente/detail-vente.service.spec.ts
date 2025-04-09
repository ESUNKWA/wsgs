import { Test, TestingModule } from '@nestjs/testing';
import { DetailVenteService } from './detail-vente.service';

describe('DetailVenteService', () => {
  let service: DetailVenteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetailVenteService],
    }).compile();

    service = module.get<DetailVenteService>(DetailVenteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
