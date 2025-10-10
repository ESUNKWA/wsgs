import { Test, TestingModule } from '@nestjs/testing';
import { DetailVenteController } from './detail-vente.controller';
import { DetailVenteService } from './detail-vente.service';

describe('DetailVenteController', () => {
  let controller: DetailVenteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DetailVenteController],
      providers: [DetailVenteService],
    }).compile();

    controller = module.get<DetailVenteController>(DetailVenteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
