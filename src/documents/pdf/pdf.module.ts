import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { VenteModule } from 'src/gestion-ventes/vente/vente.module';
import { DevisModule } from 'src/gestion-ventes/devis/devis.module';

@Module({
  imports: [VenteModule, DevisModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
