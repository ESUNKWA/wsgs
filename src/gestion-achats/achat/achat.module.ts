import { Module } from '@nestjs/common';
import { AchatService } from './achat.service';
import { AchatController } from './achat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achat } from './entities/achat.entity';
import { ResponseService } from 'src/services/response/response.service';
import { DetailAchatModule } from '../detail-achat/detail-achat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Achat]), DetailAchatModule],
  controllers: [AchatController],
  providers: [AchatService, ResponseService],
})
export class AchatModule {}
