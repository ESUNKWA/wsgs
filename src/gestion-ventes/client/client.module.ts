import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [ClientController],
  providers: [ClientService, ResponseService],
})
export class ClientModule {}
