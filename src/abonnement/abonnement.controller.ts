import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AbonnementService } from './abonnement.service';
import { SouscrireAbonnementDto } from './dto/souscrire-abonnement.dto';
import { ResponseService } from 'src/services/response/response.service';
import { PlanType } from './entities/plan-tarif.entity';
import { TypeTarif } from './entities/config-tarif.entity';
import { TenantService } from 'src/tenant/tenant.service';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { PdfService } from 'src/documents/pdf/pdf.service';

@Controller('abonnement')
export class AbonnementController {
  constructor(
    private readonly abonnementService: AbonnementService,
    private readonly responseService: ResponseService,
    private readonly tenantService: TenantService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── Plans tarifaires (super_admin) ───────────────────────────────────────

  @Get('plans')
  async getPlans() {
    const data = await this.abonnementService.getPlans();
    return this.responseService.success('Plans tarifaires', data);
  }

  @Post('plans')
  async upsertPlan(@Body() body: { plan: PlanType; montant: number; devise?: string }) {
    const data = await this.abonnementService.upsertPlan(body.plan, body.montant, body.devise);
    return this.responseService.success('Plan mis à jour', data);
  }

  // ─── Liste (super_admin) ──────────────────────────────────────────────────

  @Get()
  async getAll() {
    const data = await this.abonnementService.getAll();
    return this.responseService.success('Liste des abonnements', data);
  }

  // ─── Abonnement courant (tenant user) ─────────────────────────────────────

  @Get('mon-abonnement')
  async getMonAbonnement(@Req() req: Request) {
    const structureId = (req as any).user?.structureId;
    if (!structureId) return this.responseService.success('Aucune structure associée', null);
    const data = await this.abonnementService.getAbonnement(structureId);
    return this.responseService.success('Abonnement', data);
  }

  // ─── Actions super_admin ──────────────────────────────────────────────────

  @Post('essai/:structureId')
  async demarrerEssai(@Param('structureId') structureId: string) {
    const data = await this.abonnementService.demarrerEssai(+structureId);
    return this.responseService.success("Période d'essai démarrée", data);
  }

  @Post('souscrire')
  async souscrire(@Body() dto: SouscrireAbonnementDto, @Req() req: Request) {
    const isSuperAdmin = (req as any).user?.is_super_admin === true;
    const data = await this.abonnementService.souscrire(dto, isSuperAdmin);
    const message = isSuperAdmin
      ? 'Souscription enregistrée et activée'
      : 'Demande de souscription envoyée — en attente de validation par le super administrateur';
    return this.responseService.success(message, data);
  }

  @Patch(':id/valider')
  async valider(@Param('id') id: string) {
    const data = await this.abonnementService.validerAbonnement(+id);
    return this.responseService.success('Abonnement validé et activé', data);
  }

  @Patch(':id/suspendre')
  async suspendre(@Param('id') id: string) {
    const data = await this.abonnementService.suspendre(+id);
    return this.responseService.success('Abonnement suspendu', data);
  }

  @Patch(':id/reactiver')
  async reactiver(@Param('id') id: string) {
    const data = await this.abonnementService.reactiver(+id);
    return this.responseService.success('Abonnement réactivé', data);
  }

  @Get(':structureId')
  async getAbonnement(@Param('structureId') structureId: string) {
    const data = await this.abonnementService.getAbonnement(+structureId);
    return this.responseService.success('Abonnement', data);
  }

  // ─── Devis de renouvellement ──────────────────────────────────────────────

  @Get(':structureId/devis/:plan')
  async getDevisRenouvellement(
    @Param('structureId') structureId: string,
    @Param('plan') plan: string,
  ) {
    const data = await this.abonnementService.calculerDevisRenouvellement(+structureId, plan as any);
    return this.responseService.success('Devis de renouvellement', data);
  }

  // ─── Boutiques facturées ──────────────────────────────────────────────────

  @Get(':structureId/boutiques')
  async getBoutiquesFacturees(@Param('structureId') structureId: string) {
    const data = await this.abonnementService.getBoutiquesFacturees(+structureId);
    return this.responseService.success('Boutiques facturées', data);
  }

  @Patch(':structureId/boutiques/:boutiqueId/desactiver')
  async desactiverBoutique(
    @Param('structureId') structureId: string,
    @Param('boutiqueId') boutiqueId: string,
  ) {
    const data = await this.abonnementService.toggleBoutiqueFacturation(+structureId, +boutiqueId, false);
    return this.responseService.success('Boutique désactivée de la facturation', data);
  }

  @Patch(':structureId/boutiques/:boutiqueId/activer')
  async activerBoutique(
    @Param('structureId') structureId: string,
    @Param('boutiqueId') boutiqueId: string,
  ) {
    const data = await this.abonnementService.toggleBoutiqueFacturation(+structureId, +boutiqueId, true);
    return this.responseService.success('Boutique réactivée dans la facturation', data);
  }

  @Patch(':structureId/boutiques/:boutiqueId/retirer')
  async retirerBoutique(
    @Param('structureId') structureId: string,
    @Param('boutiqueId') boutiqueId: string,
  ) {
    const data = await this.abonnementService.retirerBoutique(+structureId, +boutiqueId);
    return this.responseService.success('Boutique retirée de la facturation', data);
  }

  @Post(':structureId/boutiques/sync')
  async syncBoutiques(@Param('structureId') structureId: string) {
    const ds = await this.tenantService.getDataSource(+structureId);
    const boutiques = await ds.getRepository(Boutique).find({
      where: { structure_id: +structureId, is_active: true },
      order: { id: 'ASC' },
    });
    const data = await this.abonnementService.syncBoutiquesExistantes(+structureId, boutiques);
    return this.responseService.success('Synchronisation effectuée', data);
  }

  // ─── Facture ──────────────────────────────────────────────────────────────

  @Get(':abonnementId/facture')
  async getFacture(@Param('abonnementId') abonnementId: string) {
    const data = await this.abonnementService.getFacture(+abonnementId);
    return this.responseService.success('Facture', data);
  }

  @Get(':abonnementId/facture/pdf')
  async getFacturePdf(
    @Param('abonnementId') abonnementId: string,
    @Res() res: Response,
  ) {
    const facture = await this.abonnementService.getFacture(+abonnementId);
    const html    = this.abonnementService.buildFactureHtml(facture);
    const fileName = `facture-${facture.reference}.pdf`;
    const buffer  = await this.pdfService.generatePdfBuffer(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  // ─── Config boutique supplémentaire ──────────────────────────────────────

  @Get('config/prix-boutique')
  async getConfigBoutiqueSupplementaire() {
    const data = await this.abonnementService.getConfigBoutiqueSupplementaire();
    return this.responseService.success('Configuration boutique supplémentaire', data);
  }

  @Post('config/prix-boutique')
  async setConfigBoutiqueSupplementaire(
    @Body() body: { valeur: number; type?: TypeTarif; devise?: string },
  ) {
    if (body.valeur === undefined || body.valeur === null) {
      throw new BadRequestException('Le champ valeur est requis');
    }
    const data = await this.abonnementService.setConfigBoutiqueSupplementaire(
      body.valeur,
      body.type ?? 'montant',
      body.devise,
    );
    return this.responseService.success('Configuration mise à jour', data);
  }
}
