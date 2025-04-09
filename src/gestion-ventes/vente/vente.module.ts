import { Module } from '@nestjs/common';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { TypeORMError } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from './entities/vente.entity';
import { DetailVente } from '../detail-vente/entities/detail-vente.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vente, DetailVente, HistoriqueStock])],
  controllers: [VenteController],
  providers: [VenteService, ResponseService],
})
export class VenteModule {}
