import { Test, TestingModule } from '@nestjs/testing';
import { ProfilsController } from './profils.controller';
import { ProfilsService } from './profils.service';

describe('ProfilsController', () => {
  let controller: ProfilsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilsController],
      providers: [ProfilsService],
    }).compile();

    controller = module.get<ProfilsController>(ProfilsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
