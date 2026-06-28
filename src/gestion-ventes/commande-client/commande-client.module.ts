import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandeClientController } from './commande-client.controller';
import { CommandeClientService } from './commande-client.service';
import { CommandeClient } from './entities/commande-client.entity';
import { DetailCommandeClient } from './entities/detail-commande-client.entity';
import { Client } from '../client/entities/client.entity';
import { ResponseService } from 'src/services/response/response.service';
import { VenteModule } from '../vente/vente.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommandeClient, DetailCommandeClient, Client]),
    VenteModule,
  ],
  controllers: [CommandeClientController],
  providers: [CommandeClientService, ResponseService],
  exports: [CommandeClientService],
})
export class CommandeClientModule {}
