import { Controller, Post, Body} from '@nestjs/common';
import { PdfService } from './pdf.service';
import { generateHtml } from 'src/common/shared/generateHtml';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Public()
@Post('facture/pdf')
async generateFacture(@Body() body: any) {
  const html = generateHtml(body);
  
  return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
}

  
}
