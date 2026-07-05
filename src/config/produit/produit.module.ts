import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { ResponseService } from 'src/services/response/response.service';
import { PdfModule } from 'src/documents/pdf/pdf.module';

@Module({
  imports: [PdfModule],
  controllers: [ProduitController],
  providers: [ProduitService, ResponseService],
})
export class ProduitModule {}
