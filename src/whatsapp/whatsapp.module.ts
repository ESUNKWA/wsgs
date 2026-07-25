import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappLog } from './entities/whatsapp-log.entity';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { ResponseService } from 'src/services/response/response.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WhatsappLog])],
  controllers: [WhatsappController],
  providers: [WhatsappService, ResponseService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
