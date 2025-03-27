import { Module } from '@nestjs/common';
import { AchatService } from './achat.service';
import { AchatController } from './achat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achat } from './entities/achat.entity';
import { ResponseService } from 'src/services/response/response.service';
import { DetailAchatModule } from '../detail-achat/detail-achat.module';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Achat, DetailAchat]), DetailAchatModule],
  controllers: [AchatController],
  providers: [AchatService, ResponseService],
})
export class AchatModule {}
