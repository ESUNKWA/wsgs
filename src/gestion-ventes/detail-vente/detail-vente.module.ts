import { Module } from '@nestjs/common';
import { DetailVenteService } from './detail-vente.service';
import { DetailVenteController } from './detail-vente.controller';

@Module({
  controllers: [DetailVenteController],
  providers: [DetailVenteService],
})
export class DetailVenteModule {}
