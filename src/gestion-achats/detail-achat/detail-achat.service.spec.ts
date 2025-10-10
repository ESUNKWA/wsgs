import { Test, TestingModule } from '@nestjs/testing';
import { DetailAchatService } from './detail-achat.service';

describe('DetailAchatService', () => {
  let service: DetailAchatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetailAchatService],
    }).compile();

    service = module.get<DetailAchatService>(DetailAchatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
