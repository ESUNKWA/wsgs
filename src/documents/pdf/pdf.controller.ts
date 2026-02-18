import { Controller, Post, Body, Param, Get} from '@nestjs/common';
import { PdfService } from './pdf.service';
import { generateHtml } from 'src/common/shared/generateHtml';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';
@Controller('pdf')
export class PdfController {

  constructor(private readonly pdfService: PdfService, private venteService: VenteService ) {}

  @Post('facture/pdf')
  async generateFactureOld(@Body() body: any) {
    const html = generateHtml(body);
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id')
  async generateFacture(@Param('id') id: string) {

    const factureData = await this.venteService.findOne(+id);
   
    const html = generateHtml(factureData.recu_data);
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

}
