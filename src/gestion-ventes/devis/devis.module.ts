import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';
import { Devis } from './entities/devis.entity';
import { DetailDevis } from './entities/detail-devis.entity';
import { Client } from '../client/entities/client.entity';
import { ResponseService } from 'src/services/response/response.service';
import { VenteModule } from '../vente/vente.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Devis, DetailDevis, Client]),
    VenteModule,
  ],
  controllers: [DevisController],
  providers: [DevisService, ResponseService],
  exports: [DevisService],
})
export class DevisModule {}
