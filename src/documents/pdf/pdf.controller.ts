import { Controller, Logger, Post, Body, Param, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PdfService } from './pdf.service';
import { generateHtml } from 'src/common/shared/generateHtml';
import { generateHtmlThermique } from 'src/common/shared/generateHtmlThermique';
import { generateFactureAbonnement, FactureAbonnementData } from 'src/common/shared/generateFactureAbonnement';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { VenteService } from 'src/gestion-ventes/vente/vente.service';
import { DevisService } from 'src/gestion-ventes/devis/devis.service';
import { formatVente } from 'src/common/helpers/formatVente';

@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly venteService: VenteService,
    private readonly devisService: DevisService,
  ) {}

  @Public()
  @Post('facture/abonnement')
  async generateFactureAbonnement(@Body() data: FactureAbonnementData, @Res() res: Response) {
    const html = generateFactureAbonnement(data);
    const buffer = await this.pdfService.generatePdfBuffer(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture_${data.numero}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('facture/pdf')
  async generateFactureOld(@Body() body: any) {
    const html = generateHtml(body, 'FACTURE');
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id')
  async generateFacture(@Param('id') id: string) {
    const vente = await this.venteService.findOne(+id);
    const recu = this.resolveRecuData(vente);
    const html = generateHtml(recu, 'FACTURE');
    return this.pdfService.generatePdf(html, `facture_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id/thermique')
  async generateFactureThermique(@Param('id') id: string) {
    const vente = await this.venteService.findOne(+id);
    const recu = this.resolveRecuData(vente);
    const html = generateHtmlThermique(recu, 'FACTURE');
    return this.pdfService.generateThermalPdf(html, `facture_thermique_${Date.now()}.pdf`);
  }

  @Public()
  @Get('generate/facture/:id/thermique/print')
  async printFactureThermique(@Param('id') id: string, @Res() res: Response) {
    const vente = await this.venteService.findOne(+id);

    this.logger.log(`[PRINT] venteId=${id} recu_data_raw=${JSON.stringify(vente.recu_data)}`);
    this.logger.log(`[PRINT] boutique_relation=${JSON.stringify({ id: (vente as any).boutique?.id, nom: (vente as any).boutique?.nom })}`);
    this.logger.log(`[PRINT] detail_vente_count=${(vente as any).detail_vente?.length}`);

    const recu = this.resolveRecuData(vente);

    this.logger.log(`[PRINT] recu_final=${JSON.stringify(recu)}`);

    const body = generateHtmlThermique(recu, 'FACTURE');
    // Injecte window.print() pour déclencher l'impression automatiquement
    const html = body.replace('</body>', `<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script></body>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /** Fallback: si recu_data stocké à la création ne contient pas le nom boutique, on le reconstruit depuis les relations chargées. */
  private resolveRecuData(vente: any): any {
    const recu = vente.recu_data ?? {};
    const base = recu.nom_boutique
      ? (this.logger.log(`[PRINT] source=recu_data_stored`), recu)
      : (this.logger.log(`[PRINT] source=fallback_formatVente (recu_data.nom_boutique manquant)`), formatVente(vente));

    // Convert the stored relative logo path (api/tenants/x/logos/file.png)
    // to a base64 data URL so Puppeteer can embed it without a network request.
    if (base.logo_boutique) {
      base.logo_boutique = this.logoToDataUrl(base.logo_boutique);
    }
    return base;
  }

  private logoToDataUrl(logoPath: string): string {
    try {
      const diskPath = path.join(process.cwd(), 'public', logoPath.replace(/^api\//, ''));
      const data = fs.readFileSync(diskPath);
      const ext = path.extname(diskPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch {
      return '';
    }
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
      logo_boutique: this.logoToDataUrl((devis.boutique as any)?.logo || ''),
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
