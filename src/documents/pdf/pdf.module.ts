import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Client } from 'src/gestion-ventes/client/entities/client.entity';
import { HistoriqueStockService } from 'src/gestion-achats/historique-stock/historique-stock.service';
import { ClientService } from 'src/gestion-ventes/client/client.service';
import { DetailVenteService } from 'src/gestion-ventes/detail-vente/detail-vente.service';
import { DetailVente } from 'src/gestion-ventes/detail-vente/entities/detail-vente.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Vente, HistoriqueStock, Client, DetailVente])],
  controllers: [PdfController],
  providers: [PdfService, VenteService, HistoriqueStockService, ClientService, DetailVenteService],
})
export class PdfModule {}
