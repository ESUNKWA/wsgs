import { Test, TestingModule } from '@nestjs/testing';
import { ProfilsService } from './profils.service';

describe('ProfilsService', () => {
  let service: ProfilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilsService],
    }).compile();

    service = module.get<ProfilsService>(ProfilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
