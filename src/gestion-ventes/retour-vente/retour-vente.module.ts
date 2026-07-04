import { Module } from '@nestjs/common';
import { RetourVenteService } from './retour-vente.service';
import { RetourVenteController } from './retour-vente.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [RetourVenteController],
  providers: [RetourVenteService, ResponseService],
})
export class RetourVenteModule {}
