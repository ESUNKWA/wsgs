import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { generateHtml } from 'src/common/shared/generateHtml';
import { generateHtmlThermique } from 'src/common/shared/generateHtmlThermique';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';
import { DevisService } from 'src/gestion-ventes/devis/devis.service';

@Controller('pdf')
export class PdfController {

  constructor(
    private readonly pdfService: PdfService,
    private readonly venteService: VenteService,
    private readonly devisService: DevisService,
  ) {}

  @Post('facture/pdf')
  async generateFactureOld(@Body() body: any) {
    const html = generateHtml(body, 'FACTURE');
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id')
  async generateFacture(@Param('id') id: string) {
    const factureData = await this.venteService.findOne(+id);
    const html = generateHtml(factureData.recu_data, 'FACTURE');
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id/thermique')
  async generateFactureThermique(@Param('id') id: string) {
    const factureData = await this.venteService.findOne(+id);
    const html = generateHtmlThermique(factureData.recu_data, 'FACTURE');
    return this.pdfService.generateThermalPdf(html, `facture_thermique_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/devis/:id')
  async generateDevis(@Param('id') id: string) {
    const devis = await this.devisService.findOne(+id);

    const data = {
      document_type: 'DEVIS',
      nom_client: devis.client?.nom || '-',
      telephone_client: devis.client?.telephone || '-',
      nom_boutique: (devis.boutique as any)?.nom || '',
      logo_boutique: (devis.boutique as any)?.logo || '',
      adresse_boutique: (devis.boutique as any)?.situation_geo || '',
      phone_boutique: (devis.boutique as any)?.telephone || '',
      email_boutique: (devis.boutique as any)?.email || '',
      reference: devis.reference,
      statut: devis.statut,
      date_vente: devis.created_at,
      montant_total: devis.montant_total,
      remise: devis.remise || 0,
      montant_total_apres_remise: devis.montant_total_apres_remise || devis.montant_total,
      detail_vente: devis.detail_devis.map((d) => ({
        produit: d.produit?.nom || '-',
        quantite: d.quantite,
        prix: d.prix_unitaire,
      })),
    };

    const html = generateHtml(data, 'DEVIS');
    return this.pdfService.generatePdf(html, `devis_${Date.now()}.pdf`);
  }
}
