import { Module } from '@nestjs/common';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';
import { ResponseService } from 'src/services/response/response.service';
import { VenteModule } from '../vente/vente.module';

@Module({
  imports: [VenteModule],
  controllers: [DevisController],
  providers: [DevisService, ResponseService],
  exports: [DevisService],
})
export class DevisModule {}
