import { Module } from '@nestjs/common';
import { DetailAchatService } from './detail-achat.service';
import { DetailAchatController } from './detail-achat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailAchat } from './entities/detail-achat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetailAchat])],
  controllers: [DetailAchatController],
  providers: [DetailAchatService]
})
export class DetailAchatModule {}
