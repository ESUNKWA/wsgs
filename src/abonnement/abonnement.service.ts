import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Abonnement, PlanAbonnement, StatutAbonnement } from './entities/abonnement.entity';
import { PlanTarif, PlanType } from './entities/plan-tarif.entity';
import { BoutiqueAbonnement } from './entities/boutique-abonnement.entity';
import { ConfigTarif, TypeTarif } from './entities/config-tarif.entity';
import { SouscrireAbonnementDto } from './dto/souscrire-abonnement.dto';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';

const CLE_PRIX_BOUTIQUE = 'prix_boutique_supplementaire';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const DUREE_PLAN: Record<PlanType, number> = {
  '1_mois': 1,
  '3_mois': 3,
  '6_mois': 6,
  '1_an':   12,
};

@Injectable()
export class AbonnementService {
  // Cache statut par structureId — TTL 5 minutes
  private readonly cache = new Map<number, { statut: StatutAbonnement | 'aucun'; cachedAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Abonnement)          private readonly abonnementRepo:     Repository<Abonnement>,
    @InjectRepository(PlanTarif)           private readonly planTarifRepo:      Repository<PlanTarif>,
    @InjectRepository(BoutiqueAbonnement)  private readonly boutiqueAboRepo:    Repository<BoutiqueAbonnement>,
    @InjectRepository(ConfigTarif)         private readonly configTarifRepo:    Repository<ConfigTarif>,
    @InjectRepository(Structure)           private readonly structureRepo:      Repository<Structure>,
  ) {}

  // ─── Essai ────────────────────────────────────────────────────────────────

  async demarrerEssai(structureId: number): Promise<Abonnement> {
    const existing = await this.abonnementRepo.findOne({ where: { structureId } });
    if (existing) throw new ConflictException(`La structure ${structureId} a déjà un abonnement.`);

    const duree = Math.min(Math.max(parseInt(process.env.TRIAL_DURATION_MONTHS || '1', 10), 1), 3);
    const date_debut = new Date();
    const date_fin   = addMonths(date_debut, duree);

    const abo = this.abonnementRepo.create({
      structureId,
      plan: 'essai' as PlanAbonnement,
      date_debut,
      date_fin,
      statut: 'actif',
      montant: 0,
      notes: `Période d'essai de ${duree} mois`,
    });
    const saved = await this.abonnementRepo.save(abo);
    this.invalidateCache(structureId);
    return saved;
  }

  // ─── Souscription ─────────────────────────────────────────────────────────

  async souscrire(dto: SouscrireAbonnementDto, isSuperAdmin = false): Promise<Abonnement> {
    const devis = await this.calculerDevisRenouvellement(dto.structureId, dto.plan);

    const maintenant = new Date();

    // Si super_admin : abonnement actif immédiatement avec dates calculées
    // Sinon : statut en_attente, dates provisoires (recalculées à la validation)
    const statut: StatutAbonnement = isSuperAdmin ? 'actif' : 'en_attente';

    let date_debut = maintenant;
    if (isSuperAdmin) {
      const courant = await this.abonnementRepo.findOne({
        where: { structureId: dto.structureId },
        order: { date_fin: 'DESC' },
      });
      if (courant?.statut === 'actif' && courant.date_fin > maintenant) {
        date_debut = courant.date_fin; // prolongation
      }
    }

    const abo = this.abonnementRepo.create({
      structureId:  dto.structureId,
      plan:         dto.plan as PlanAbonnement,
      date_debut,
      date_fin:     addMonths(date_debut, DUREE_PLAN[dto.plan]),
      statut,
      montant:      dto.montant ?? devis.total,
      devise:       devis.devise,
      notes:        dto.notes ?? null,
    });

    const saved = await this.abonnementRepo.save(abo);
    this.invalidateCache(dto.structureId);
    return { ...saved, devis } as any;
  }

  // ─── Validation super_admin ───────────────────────────────────────────────

  async validerAbonnement(id: number): Promise<Abonnement> {
    const abo = await this.abonnementRepo.findOne({ where: { id } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    if (abo.statut !== 'en_attente') {
      throw new BadRequestException(`Cet abonnement n'est pas en attente de validation (statut actuel : ${abo.statut})`);
    }

    // Recalcul des dates depuis le moment de la validation
    const maintenant = new Date();
    const courant = await this.abonnementRepo.findOne({
      where: { structureId: abo.structureId, statut: 'actif' },
      order: { date_fin: 'DESC' },
    });
    const date_debut = courant && courant.date_fin > maintenant ? courant.date_fin : maintenant;
    const date_fin   = addMonths(date_debut, DUREE_PLAN[abo.plan as PlanType]);

    await this.abonnementRepo.update(id, { statut: 'actif', date_debut, date_fin });
    this.invalidateCache(abo.structureId);
    return { ...abo, statut: 'actif', date_debut, date_fin };
  }

  // ─── Devis de renouvellement ──────────────────────────────────────────────

  async calculerDevisRenouvellement(structureId: number, plan: PlanType): Promise<{
    plan: PlanType;
    prix_base: number;
    boutiques_incluses: number;
    boutiques_supplementaires: number;
    config_boutique: { valeur: number; type: TypeTarif };
    prix_boutique_supplementaire: number;
    montant_boutiques_supplementaires: number;
    total: number;
    devise: string;
    detail_boutiques: BoutiqueAbonnement[];
  }> {
    const planTarif = await this.planTarifRepo.findOne({ where: { plan } });
    const prixBase  = planTarif?.montant ?? 0;
    const devise    = planTarif?.devise  ?? 'XOF';

    const boutiquesExtra = await this.boutiqueAboRepo.find({
      where: { structureId, est_active: true },
    });
    const nbExtra = boutiquesExtra.length;

    const config = await this.getConfigBoutiqueSupplementaire();
    // Si pourcentage : prix par boutique = % du plan de base
    const prixExtra = config.type === 'pourcentage'
      ? Math.round(prixBase * (config.valeur / 100))
      : config.valeur;
    const montantExtra = nbExtra * prixExtra;

    return {
      plan,
      prix_base: prixBase,
      boutiques_incluses: 1,
      boutiques_supplementaires: nbExtra,
      config_boutique: { valeur: config.valeur, type: config.type },
      prix_boutique_supplementaire: prixExtra,
      montant_boutiques_supplementaires: montantExtra,
      total: prixBase + montantExtra,
      devise,
      detail_boutiques: boutiquesExtra,
    };
  }

  // ─── Gestion des boutiques supplémentaires ────────────────────────────────

  async notifierAjoutBoutique(structureId: number, boutiqueId: number, boutiqueNom: string): Promise<BoutiqueAbonnement | null> {
    // Déjà une entrée pour cette boutique ?
    const existante = await this.boutiqueAboRepo.findOne({ where: { structureId, boutiqueId } });
    if (existante) {
      if (!existante.est_active) {
        await this.boutiqueAboRepo.update(existante.id, { est_active: true, date_desactivation: null });
      }
      return existante;
    }

    const entry = this.boutiqueAboRepo.create({
      structureId,
      boutiqueId,
      boutiqueNom,
      est_active: true,
    });
    return this.boutiqueAboRepo.save(entry);
  }

  async notifierDesactivationBoutique(structureId: number, boutiqueId: number): Promise<void> {
    await this.boutiqueAboRepo.update(
      { structureId, boutiqueId },
      { est_active: false, date_desactivation: new Date() },
    );
  }

  async notifierActivationBoutique(structureId: number, boutiqueId: number): Promise<void> {
    await this.boutiqueAboRepo.update(
      { structureId, boutiqueId },
      { est_active: true, date_desactivation: null },
    );
  }

  async getBoutiquesFacturees(structureId: number): Promise<BoutiqueAbonnement[]> {
    return this.boutiqueAboRepo.find({ where: { structureId }, order: { date_ajout: 'ASC' } });
  }

  async toggleBoutiqueFacturation(structureId: number, boutiqueId: number, activer: boolean): Promise<BoutiqueAbonnement> {
    const entry = await this.boutiqueAboRepo.findOne({ where: { structureId, boutiqueId } });
    if (!entry) throw new NotFoundException('Boutique non trouvée dans la facturation');
    await this.boutiqueAboRepo.update(entry.id, {
      est_active: activer,
      date_desactivation: activer ? null : new Date(),
    });
    return { ...entry, est_active: activer, date_desactivation: activer ? null : new Date() };
  }

  async retirerBoutique(structureId: number, boutiqueId: number): Promise<{ message: string }> {
    const entry = await this.boutiqueAboRepo.findOne({ where: { structureId, boutiqueId } });
    if (!entry) throw new NotFoundException('Boutique non trouvée dans la facturation');
    await this.boutiqueAboRepo.delete(entry.id);
    return { message: `Boutique ${boutiqueId} retirée de la facturation pour la structure ${structureId}` };
  }

  // boutiques : liste fournie par le contrôleur (évite la dépendance circulaire avec TenantService)
  async syncBoutiquesExistantes(
    structureId: number,
    boutiques: { id: number; nom: string }[],
  ): Promise<{ ajoutees: number; deja_presentes: number; boutiques: BoutiqueAbonnement[] }> {
    // La 1ère boutique (la plus ancienne) est incluse dans le plan — on la saute
    const extra = boutiques.slice(1);

    let ajoutees = 0;
    let deja_presentes = 0;

    for (const b of extra) {
      const existante = await this.boutiqueAboRepo.findOne({ where: { structureId, boutiqueId: b.id } });
      if (existante) {
        deja_presentes++;
        continue;
      }
      await this.boutiqueAboRepo.save(
        this.boutiqueAboRepo.create({
          structureId,
          boutiqueId: b.id,
          boutiqueNom: b.nom,
          est_active: true,
        }),
      );
      ajoutees++;
    }

    const boutiquesFacturees = await this.getBoutiquesFacturees(structureId);
    return { ajoutees, deja_presentes, boutiques: boutiquesFacturees };
  }

  // ─── Configuration boutique supplémentaire ───────────────────────────────

  async getConfigBoutiqueSupplementaire(): Promise<{ valeur: number; type: TypeTarif; devise: string }> {
    const config = await this.configTarifRepo.findOne({ where: { cle: CLE_PRIX_BOUTIQUE } });
    return {
      valeur: config?.valeur ?? 0,
      type: (config?.type ?? 'montant') as TypeTarif,
      devise: config?.devise ?? 'XOF',
    };
  }

  async setConfigBoutiqueSupplementaire(
    valeur: number,
    type: TypeTarif = 'montant',
    devise = 'XOF',
  ): Promise<ConfigTarif> {
    if (type === 'pourcentage' && (valeur < 0 || valeur > 100)) {
      throw new Error('Le pourcentage doit être compris entre 0 et 100');
    }
    const description = type === 'pourcentage'
      ? `${valeur}% du plan de base par boutique supplémentaire`
      : 'Montant fixe par boutique supplémentaire';

    const existing = await this.configTarifRepo.findOne({ where: { cle: CLE_PRIX_BOUTIQUE } });
    if (existing) {
      await this.configTarifRepo.update(existing.id, { valeur, type, devise, description });
      return { ...existing, valeur, type, devise, description };
    }
    return this.configTarifRepo.save(
      this.configTarifRepo.create({ cle: CLE_PRIX_BOUTIQUE, valeur, type, devise, description }),
    );
  }

  /** @deprecated Utiliser getConfigBoutiqueSupplementaire() */
  async getPrixBoutiqueSupplementaire(): Promise<number> {
    const config = await this.getConfigBoutiqueSupplementaire();
    return config.valeur;
  }

  // ─── Période d'essai ─────────────────────────────────────────────────────

  async isEnEssai(structureId: number): Promise<boolean> {
    const abo = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });
    return !!abo && abo.plan === 'essai' && abo.statut === 'actif';
  }

  // ─── Statut (utilisé par le guard — avec cache) ───────────────────────────

  async checkStatut(structureId: number): Promise<StatutAbonnement | 'aucun'> {
    const cached = this.cache.get(structureId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) return cached.statut;

    // Chercher d'abord un abonnement actif, sinon le plus récent
    const abo = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });

    if (!abo) return this.setCache(structureId, 'aucun');
    if (abo.statut === 'suspendu') return this.setCache(structureId, 'suspendu');
    if (abo.statut === 'en_attente') return this.setCache(structureId, 'en_attente');

    if (abo.date_fin < new Date() && abo.statut === 'actif') {
      await this.abonnementRepo.update(abo.id, { statut: 'expire' });
      return this.setCache(structureId, 'expire');
    }

    return this.setCache(structureId, abo.statut);
  }

  // ─── Lecture ──────────────────────────────────────────────────────────────

  async getAbonnement(structureId: number): Promise<any | null> {
    const abo = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });
    if (!abo) return null;
    const jours_restants = Math.max(0, Math.ceil((abo.date_fin.getTime() - Date.now()) / 86400000));
    const boutiques_supplementaires = await this.boutiqueAboRepo.count({ where: { structureId, est_active: true } });
    return { ...abo, jours_restants, boutiques_supplementaires };
  }

  async getAll(): Promise<any[]> {
    const abos = await this.abonnementRepo.find({ order: { created_at: 'DESC' } });
    return Promise.all(abos.map(async a => ({
      ...a,
      jours_restants: Math.max(0, Math.ceil((a.date_fin.getTime() - Date.now()) / 86400000)),
      boutiques_supplementaires: await this.boutiqueAboRepo.count({ where: { structureId: a.structureId, est_active: true } }),
    })));
  }

  // ─── Facture ──────────────────────────────────────────────────────────────

  async getFacture(abonnementId: number): Promise<any> {
    const abo = await this.abonnementRepo.findOne({ where: { id: abonnementId } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');

    const structure = await this.structureRepo.findOne({ where: { id: abo.structureId } });
    const boutiquesExtra = await this.boutiqueAboRepo.find({ where: { structureId: abo.structureId }, order: { date_ajout: 'ASC' } });
    const nbExtra = boutiquesExtra.filter(b => b.est_active).length;
    const configExtra = await this.getConfigBoutiqueSupplementaire();
    // Reconstitue le plan pour recalculer le vrai prix unitaire au moment de la souscription
    const planTarif = await this.planTarifRepo.findOne({ where: { plan: abo.plan as any } });
    const prixExtra = configExtra.type === 'pourcentage'
      ? Math.round((planTarif?.montant ?? 0) * (configExtra.valeur / 100))
      : configExtra.valeur;

    const reference = `FACT-${String(abo.structureId).padStart(4, '0')}-${String(abo.id).padStart(6, '0')}`;

    return {
      reference,
      date_emission: new Date(),
      abonnement: {
        id: abo.id,
        plan: abo.plan,
        statut: abo.statut,
        date_debut: abo.date_debut,
        date_fin: abo.date_fin,
      },
      structure: structure
        ? { id: structure.id, nom: structure.nom, telephone: structure.telephone, email: structure.email, adresse: structure.situation_geo }
        : { id: abo.structureId },
      detail: {
        plan_base: { label: `Plan ${abo.plan.replace('_', ' ')}`, montant: abo.montant - nbExtra * prixExtra, devise: abo.devise },
        boutiques_supplementaires: boutiquesExtra.map(b => ({
          boutiqueNom: b.boutiqueNom,
          est_active: b.est_active,
          prix_unitaire: prixExtra,
          config: { valeur: configExtra.valeur, type: configExtra.type },
          devise: abo.devise,
        })),
        nb_boutiques_facturees: nbExtra,
        montant_boutiques: nbExtra * prixExtra,
        total: abo.montant,
        devise: abo.devise,
      },
    };
  }

  private getLogoHtml(height = 52): string {
    const logoPath = path.join(process.cwd(), 'public', 'assets', 'ekwatech-logo.png');
    if (fs.existsSync(logoPath)) {
      const b64 = fs.readFileSync(logoPath).toString('base64');
      return `<img src="data:image/png;base64,${b64}" style="height:${height}px;width:auto;object-fit:contain;" alt="Ekwatech">`;
    }
    return `<div style="height:${height}px;width:${height}px;background:#F26360;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:${Math.round(height*0.4)}px;">E</div>`;
  }

  buildFactureHtml(facture: any): string {
    const f = (v: any) => (v && v !== 'null' && v !== 'undefined') ? v : null;
    const fmt = (n: number, d = 'XOF') => `${Number(n).toLocaleString('fr-FR')} ${d}`;
    const fmtDate = (d: any) => new Date(d).toLocaleDateString('fr-FR');

    const statut = facture.abonnement.statut;
    const badgeColor: Record<string, string> = {
      actif:      'background:#d1fae5;color:#065f46;',
      expire:     'background:#fee2e2;color:#991b1b;',
      suspendu:   'background:#fef3c7;color:#92400e;',
      en_attente: 'background:#dbeafe;color:#1e40af;',
      essai:      'background:#ede9fe;color:#5b21b6;',
    };

    const lignesBoutiques = facture.detail.boutiques_supplementaires
      .filter((b: any) => b.est_active)
      .map((b: any, i: number) => {
        const label = b.config?.type === 'pourcentage'
          ? `Boutique supplémentaire — ${b.boutiqueNom} (${b.config.valeur}% du plan)`
          : `Boutique supplémentaire — ${b.boutiqueNom}`;
        return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f7f7'}">
          <td style="padding:10px 14px;border:1px solid #ddd;">${label}</td>
          <td style="padding:10px 14px;border:1px solid #ddd;text-align:right;white-space:nowrap;">${fmt(b.prix_unitaire, b.devise)}</td>
        </tr>`;
      }).join('');

    const clientLines = [
      f(facture.structure.nom)      ? `<strong>${f(facture.structure.nom)}</strong>` : null,
      f(facture.structure.email)    ? f(facture.structure.email) : null,
      f(facture.structure.telephone)? f(facture.structure.telephone) : null,
      f(facture.structure.adresse)  ? f(facture.structure.adresse) : null,
    ].filter(Boolean).join('<br>');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #333; background: #fff; padding: 40px 45px 70px; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
    .header-info h1 { font-size: 17pt; color: #F26360; font-weight: bold; }
    .header-info .slogan { font-style: italic; font-size: 9pt; color: #6B7B7E; margin: 2px 0; }
    .header-info .contact { font-size: 9pt; color: #6B7B7E; }
    hr.sep { border: none; border-bottom: 1.5px solid #F26360; margin: 10px 0 16px; }
    .title-section { text-align: right; margin-bottom: 20px; }
    .title-section h2 { font-size: 22pt; color: #F26360; font-weight: bold; letter-spacing: 2px; }
    .title-section .numero { font-size: 10pt; color: #6B7B7E; margin-top: 4px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 20px; }
    .meta-client .label { font-weight: bold; color: #444; font-size: 8pt; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
    .meta-client .value { font-size: 10pt; line-height: 1.7; }
    .meta-dates { text-align: right; font-size: 10pt; line-height: 1.9; }
    .meta-dates span { display: block; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead tr { background: #2d2d2d; }
    table.items thead th { padding: 10px 14px; color: #fff; font-size: 10pt; border: 1px solid #2d2d2d; }
    table.items thead th:first-child { text-align: left; }
    table.items thead th:last-child  { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-top: 0; }
    .totals-table { width: 280px; border-collapse: collapse; }
    .totals-table td { padding: 7px 14px; font-size: 10pt; }
    .total-row td { background: #f5f5f5; border-top: 2px solid #222; padding: 10px 14px; }
    .total-label { text-align: right; font-size: 11pt; font-weight: bold; color: #111; }
    .total-value { text-align: right; font-size: 12pt; font-weight: bold; color: #111; white-space: nowrap; }
    .periode-box { background: #f7f7f7; border-left: 4px solid #555; padding: 12px 16px; margin-bottom: 24px; font-size: 10pt; line-height: 1.8; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #ccc; padding: 10px 45px; text-align: center; font-size: 9pt; color: #6B7B7E; font-style: italic; background: #fff; }
  </style>
</head>
<body>

  <!-- En-tête Ekwatech -->
  <div class="header">
    ${this.getLogoHtml(72)}
    <div class="header-info">
      <h1>EKWATECH SOLUTIONS</h1>
      <p class="slogan">IT Business Solutions</p>
      <p class="contact">+225 07 12 09 27 83&nbsp;&nbsp;|&nbsp;&nbsp;www.ekwatech.com</p>
    </div>
  </div>
  <hr class="sep">

  <!-- Titre -->
  <div class="title-section">
    <h2>FACTURE</h2>
    <p class="numero">N° ${facture.reference}</p>
  </div>

  <!-- Client + Dates -->
  <div class="meta-row">
    <div class="meta-client">
      <p class="label">Facturé à</p>
      <div class="value">${clientLines}</div>
    </div>
    <div class="meta-dates">
      <span><strong>Date d'émission&nbsp;:</strong> ${fmtDate(facture.date_emission)}</span>
      <span><strong>Devise&nbsp;:</strong> ${facture.detail.devise}</span>
      <span><strong>Statut&nbsp;:</strong> <span class="badge" style="${badgeColor[statut] ?? ''}">${statut.toUpperCase()}</span></span>
    </div>
  </div>

  <!-- Période d'abonnement -->
  <div class="periode-box">
    <strong style="color:#F26360;">Période d'abonnement</strong><br>
    Plan : <strong>${facture.abonnement.plan.replace('_', ' ').toUpperCase()}</strong>
    &nbsp;&nbsp;—&nbsp;&nbsp;
    Du <strong>${fmtDate(facture.abonnement.date_debut)}</strong>
    au <strong>${fmtDate(facture.abonnement.date_fin)}</strong>
  </div>

  <!-- Lignes de détail -->
  <table class="items">
    <thead>
      <tr>
        <th style="width:75%;text-align:left;">Désignation</th>
        <th style="width:25%;text-align:right;">Montant (${facture.detail.devise})</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f7f7f7;">
        <td style="padding:10px 14px;border:1px solid #ddd;">Plan de base — ${facture.abonnement.plan.replace('_', ' ')}</td>
        <td style="padding:10px 14px;border:1px solid #ddd;text-align:right;white-space:nowrap;">${fmt(facture.detail.plan_base.montant, facture.detail.devise)}</td>
      </tr>
      ${lignesBoutiques}
    </tbody>
  </table>

  <!-- Total -->
  <div class="totals">
    <table class="totals-table">
      <tr class="total-row">
        <td class="total-label">TOTAL À PAYER</td>
        <td class="total-value">${fmt(facture.detail.total, facture.detail.devise)}</td>
      </tr>
    </table>
  </div>

  <!-- Pied de page -->
  <div class="footer">
    Ekwatech Solutions — Merci pour votre confiance.
  </div>

</body>
</html>`;
  }

  buildContratHtml(facture: any): string {
    const f = (v: any) => (v && v !== 'null' && v !== 'undefined') ? v : null;
    const fmtDate = (d: any) => new Date(d).toLocaleDateString('fr-FR');
    const fmt = (n: number, d = 'XOF') => `${Number(n).toLocaleString('fr-FR')} ${d}`;

    const dureeLabel: Record<string, string> = {
      essai: "1 mois (période d'essai)",
      '1_mois': '1 mois',
      '3_mois': '3 mois',
      '6_mois': '6 mois',
      '1_an':   '12 mois',
    };
    const plan = facture.abonnement.plan;
    const contratRef = `CTR-${String(facture.structure.id).padStart(4,'0')}-${String(facture.abonnement.id).padStart(6,'0')}`;

    const clientLines = [
      f(facture.structure.nom),
      f(facture.structure.telephone),
      f(facture.structure.email),
      f(facture.structure.adresse),
    ].filter(Boolean);

    const lignesBoutiques = facture.detail.boutiques_supplementaires
      .filter((b: any) => b.est_active)
      .map((b: any) => {
        const label = b.config?.type === 'pourcentage'
          ? `${b.boutiqueNom} (${b.config.valeur}% du plan)`
          : b.boutiqueNom;
        return `<li>${label} : <strong>${fmt(b.prix_unitaire, b.devise)}</strong></li>`;
      }).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 10.5pt; color: #222; background: #fff; padding: 40px 50px 80px; line-height: 1.6; }

    /* En-tête */
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
    .logo-box { height: 54px; width: auto; flex-shrink: 0; }
    .header-info h1 { font-size: 17pt; color: #F26360; font-weight: bold; }
    .header-info .sub { font-style: italic; font-size: 9pt; color: #6B7B7E; }
    .header-info .contact { font-size: 9pt; color: #6B7B7E; }
    hr.sep { border: none; border-bottom: 1.5px solid #F26360; margin: 10px 0 20px; }

    /* Titre contrat */
    .contrat-title { text-align: center; margin-bottom: 6px; }
    .contrat-title h2 { font-size: 18pt; color: #F26360; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
    .contrat-title .ref { font-size: 10pt; color: #6B7B7E; margin-top: 4px; }
    .contrat-title .date { font-size: 10pt; color: #6B7B7E; }
    hr.sep2 { border: none; border-bottom: 1px solid #ccc; margin: 16px 0; }

    /* Parties */
    .parties { display: flex; gap: 20px; margin-bottom: 24px; }
    .partie-box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 14px 16px; }
    .partie-box .partie-label { font-size: 8pt; font-weight: bold; color: #444; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .partie-box .partie-nom { font-size: 11pt; font-weight: bold; margin-bottom: 4px; }
    .partie-box p { font-size: 9.5pt; color: #444; line-height: 1.7; }

    /* Sections */
    .article { margin-bottom: 20px; }
    .article h3 { font-size: 11pt; font-weight: bold; color: #222; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 3px; border-bottom: 1px solid #ddd; }
    .article p, .article li { font-size: 10pt; color: #333; line-height: 1.7; }
    .article ul { padding-left: 20px; margin-top: 4px; }
    .article ul li { margin-bottom: 3px; }

    /* Tableau tarifaire */
    .tarif-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .tarif-table thead tr { background: #2d2d2d; }
    .tarif-table thead th { padding: 9px 12px; color: #fff; font-size: 10pt; border: 1px solid #2d2d2d; }
    .tarif-table thead th:first-child { text-align: left; }
    .tarif-table thead th:last-child  { text-align: right; }
    .tarif-table tbody tr:nth-child(odd)  { background: #f7f7f7; }
    .tarif-table tbody tr:nth-child(even) { background: #fff; }
    .tarif-table tbody td { padding: 9px 12px; border: 1px solid #ddd; font-size: 10pt; }
    .tarif-table tbody td:last-child { text-align: right; white-space: nowrap; }
    .tarif-table tfoot td { padding: 10px 12px; border-top: 2px solid #222; background: #f0f0f0; font-weight: bold; color: #111; font-size: 11pt; }
    .tarif-table tfoot td:last-child { text-align: right; }

    /* Signatures */
    .signatures { display: flex; gap: 40px; margin-top: 30px; }
    .sig-box { flex: 1; border-top: 1px solid #555; padding-top: 10px; }
    .sig-box .sig-label { font-size: 9pt; color: #222; font-weight: bold; text-transform: uppercase; margin-bottom: 50px; }
    .sig-box .sig-name { font-size: 10pt; color: #555; }

    /* Footer */
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #ccc; padding: 8px 50px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #6B7B7E; font-style: italic; background: #fff; }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="header">
    ${this.getLogoHtml(72)}
    <div class="header-info">
      <h1>EKWATECH SOLUTIONS</h1>
      <p class="sub">IT Business Solutions</p>
      <p class="contact">+225 07 12 09 27 83&nbsp;&nbsp;|&nbsp;&nbsp;www.ekwatech.com</p>
    </div>
  </div>
  <hr class="sep">

  <!-- Titre -->
  <div class="contrat-title">
    <h2>Contrat d'abonnement</h2>
    <p class="ref">Réf. ${contratRef}</p>
    <p class="date">Émis le ${fmtDate(new Date())}</p>
  </div>
  <hr class="sep2">

  <!-- Parties -->
  <div class="parties">
    <div class="partie-box">
      <p class="partie-label">Le Prestataire</p>
      <p class="partie-nom">EKWATECH SOLUTIONS</p>
      <p>IT Business Solutions<br>
      +225 07 12 09 27 83<br>
      www.ekwatech.com</p>
    </div>
    <div class="partie-box">
      <p class="partie-label">Le Client (Abonné)</p>
      <p class="partie-nom">${f(facture.structure.nom) ?? '—'}</p>
      <p>${clientLines.slice(1).join('<br>')}</p>
    </div>
  </div>

  <!-- Article 1 : Objet -->
  <div class="article">
    <h3>Article 1 — Objet du contrat</h3>
    <p>Le présent contrat a pour objet de définir les conditions dans lesquelles <strong>Ekwatech Solutions</strong>
    fournit à <strong>${f(facture.structure.nom) ?? 'l\'abonné'}</strong> l'accès à la plateforme de gestion
    commerciale <strong>NeuStock</strong>, solution SaaS de gestion des stocks, ventes, achats et caisse.</p>
  </div>

  <!-- Article 2 : Plan souscrit -->
  <div class="article">
    <h3>Article 2 — Plan souscrit et durée</h3>
    <p>
      Plan souscrit : <strong>${plan.replace('_', ' ').toUpperCase()}</strong> (durée : ${dureeLabel[plan] ?? plan})<br>
      Date de début : <strong>${fmtDate(facture.abonnement.date_debut)}</strong><br>
      Date de fin &nbsp;: <strong>${fmtDate(facture.abonnement.date_fin)}</strong>
    </p>
  </div>

  <!-- Article 3 : Tarification -->
  <div class="article">
    <h3>Article 3 — Tarification</h3>
    <table class="tarif-table">
      <thead>
        <tr>
          <th style="width:70%">Désignation</th>
          <th style="width:30%">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Plan de base — ${plan.replace('_', ' ')} (1 boutique incluse)</td>
          <td>${fmt(facture.detail.plan_base.montant, facture.detail.devise)}</td>
        </tr>
        ${facture.detail.boutiques_supplementaires.filter((b: any) => b.est_active).map((b: any, i: number) => {
          const label = b.config?.type === 'pourcentage'
            ? `Boutique supplémentaire — ${b.boutiqueNom} (${b.config.valeur}% du plan)`
            : `Boutique supplémentaire — ${b.boutiqueNom}`;
          return `<tr><td>${label}</td><td>${fmt(b.prix_unitaire, b.devise)}</td></tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td>TOTAL DU CONTRAT</td>
          <td>${fmt(facture.detail.total, facture.detail.devise)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Article 4 : Services inclus -->
  <div class="article">
    <h3>Article 4 — Services inclus</h3>
    <ul>
      <li>Accès illimité à la plateforme NeuStock pendant la durée du contrat</li>
      <li>Gestion des stocks, ventes, achats, devis et commandes clients</li>
      <li>Gestion de la caisse et des sessions caisse</li>
      <li>Génération de factures et reçus PDF</li>
      <li>Tableau de bord et statistiques en temps réel</li>
      <li>Support technique par email et téléphone</li>
      <li>Mises à jour de la plateforme incluses</li>
    </ul>
  </div>

  <!-- Article 5 : Obligations du client -->
  <div class="article">
    <h3>Article 5 — Obligations du client</h3>
    <ul>
      <li>Régler le montant de l'abonnement dans les délais convenus</li>
      <li>Utiliser la plateforme dans le respect des lois en vigueur</li>
      <li>Ne pas partager ses identifiants de connexion avec des tiers non autorisés</li>
      <li>Informer Ekwatech Solutions de tout changement de coordonnées</li>
    </ul>
  </div>

  <!-- Article 6 : Résiliation -->
  <div class="article">
    <h3>Article 6 — Résiliation</h3>
    <p>Le contrat prend fin à l'échéance de la période souscrite. En cas de non-renouvellement, l'accès à la
    plateforme est automatiquement suspendu à la date de fin. Toute résiliation anticipée ne donne pas lieu
    à remboursement, sauf accord écrit entre les parties.</p>
  </div>

  <!-- Article 7 : Confidentialité -->
  <div class="article">
    <h3>Article 7 — Confidentialité et données</h3>
    <p>Ekwatech Solutions s'engage à ne pas divulguer les données du client à des tiers. Les données sont
    hébergées de manière sécurisée et restent la propriété exclusive du client. En cas de résiliation,
    le client peut demander l'export de ses données dans un délai de 30 jours.</p>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-box">
      <p class="sig-label">Pour Ekwatech Solutions</p>
      <p class="sig-name">Nom &amp; signature :</p>
    </div>
    <div class="sig-box">
      <p class="sig-label">Pour ${f(facture.structure.nom) ?? 'le client'}</p>
      <p class="sig-name">Nom &amp; signature :</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>Ekwatech Solutions — Contrat d'abonnement NeuStock</span>
    <span>Réf. ${contratRef}</span>
  </div>

</body>
</html>`;
  }

  // ─── Actions super_admin ──────────────────────────────────────────────────

  async suspendre(id: number): Promise<Abonnement> {
    const abo = await this.abonnementRepo.findOne({ where: { id } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    await this.abonnementRepo.update(id, { statut: 'suspendu' });
    this.invalidateCache(abo.structureId);
    return { ...abo, statut: 'suspendu' };
  }

  async reactiver(id: number): Promise<Abonnement> {
    const abo = await this.abonnementRepo.findOne({ where: { id } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    if (abo.date_fin < new Date()) {
      throw new BadRequestException('Abonnement expiré. Souscrivez à un nouveau plan.');
    }
    await this.abonnementRepo.update(id, { statut: 'actif' });
    this.invalidateCache(abo.structureId);
    return { ...abo, statut: 'actif' };
  }

  // ─── Plans tarifaires ─────────────────────────────────────────────────────

  async getPlans(): Promise<PlanTarif[]> {
    return this.planTarifRepo.find({ order: { id: 'ASC' } });
  }

  async upsertPlan(plan: PlanType, montant: number, devise = 'XOF'): Promise<PlanTarif> {
    const existing = await this.planTarifRepo.findOne({ where: { plan } });
    if (existing) {
      await this.planTarifRepo.update(existing.id, { montant, devise });
      return { ...existing, montant, devise };
    }
    return this.planTarifRepo.save(
      this.planTarifRepo.create({ plan, montant, devise, est_actif: true }),
    );
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private setCache(structureId: number, statut: StatutAbonnement | 'aucun'): StatutAbonnement | 'aucun' {
    this.cache.set(structureId, { statut, cachedAt: Date.now() });
    return statut;
  }

  private invalidateCache(structureId: number): void {
    this.cache.delete(structureId);
  }
}
