import { Module } from '@nestjs/common';
import { DetailAchatService } from './detail-achat.service';
import { DetailAchatController } from './detail-achat.controller';

@Module({
  controllers: [DetailAchatController],
  providers: [DetailAchatService],
})
export class DetailAchatModule {}
