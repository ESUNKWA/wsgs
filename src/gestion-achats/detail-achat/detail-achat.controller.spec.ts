import { Test, TestingModule } from '@nestjs/testing';
import { DetailAchatController } from './detail-achat.controller';
import { DetailAchatService } from './detail-achat.service';

describe('DetailAchatController', () => {
  let controller: DetailAchatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DetailAchatController],
      providers: [DetailAchatService],
    }).compile();

    controller = module.get<DetailAchatController>(DetailAchatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
