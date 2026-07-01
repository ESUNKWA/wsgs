import { Module } from '@nestjs/common';
import { CommandeClientController } from './commande-client.controller';
import { CommandeClientService } from './commande-client.service';
import { ResponseService } from 'src/services/response/response.service';
import { VenteModule } from '../vente/vente.module';

@Module({
  imports: [VenteModule],
  controllers: [CommandeClientController],
  providers: [CommandeClientService, ResponseService],
  exports: [CommandeClientService],
})
export class CommandeClientModule {}
