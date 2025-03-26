import { Test, TestingModule } from '@nestjs/testing';
import { AchatController } from './achat.controller';
import { AchatService } from './achat.service';

describe('AchatController', () => {
  let controller: AchatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchatController],
      providers: [AchatService],
    }).compile();

    controller = module.get<AchatController>(AchatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
