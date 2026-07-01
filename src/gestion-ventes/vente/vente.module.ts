import { Module } from '@nestjs/common';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [VenteController],
  providers: [VenteService, ResponseService],
  exports: [VenteService],
})
export class VenteModule {}
