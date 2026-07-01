import { Module } from '@nestjs/common';
import { AchatService } from './achat.service';
import { AchatController } from './achat.controller';
import { ResponseService } from 'src/services/response/response.service';
import { DetailAchatModule } from '../detail-achat/detail-achat.module';

@Module({
  imports: [DetailAchatModule],
  controllers: [AchatController],
  providers: [AchatService, ResponseService],
  exports: [AchatService],
})
export class AchatModule {}
