import { Module } from '@nestjs/common';
import { CommandeFournisseurController } from './commande-fournisseur.controller';
import { CommandeFournisseurService } from './commande-fournisseur.service';
import { ResponseService } from 'src/services/response/response.service';
import { AchatModule } from '../achat/achat.module';
import { PdfModule } from 'src/documents/pdf/pdf.module';

@Module({
  imports: [AchatModule, PdfModule],
  controllers: [CommandeFournisseurController],
  providers: [CommandeFournisseurService, ResponseService],
  exports: [CommandeFournisseurService],
})
export class CommandeFournisseurModule {}
