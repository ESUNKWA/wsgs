import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  buildFactureHtml(facture: any): string {
    const lignesBoutiques = facture.detail.boutiques_supplementaires
      .filter((b: any) => b.est_active)
      .map((b: any) => {
        const label = b.config?.type === 'pourcentage'
          ? `Boutique supplémentaire — ${b.boutiqueNom} (${b.config.valeur}% du plan)`
          : `Boutique supplémentaire — ${b.boutiqueNom}`;
        return `
        <tr>
          <td>${label}</td>
          <td style="text-align:right">${b.prix_unitaire.toLocaleString()} ${b.devise}</td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333; padding: 30px; }
    h1 { color: #1a56db; font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section h3 { font-size: 13px; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
    .total-row td { font-weight: bold; font-size: 14px; border-top: 2px solid #1a56db; border-bottom: none; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    .actif { background: #d1fae5; color: #065f46; }
    .expire { background: #fee2e2; color: #991b1b; }
    .suspendu { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <h1>Facture d'abonnement</h1>
  <div class="meta">
    Référence : <strong>${facture.reference}</strong> &nbsp;|&nbsp;
    Émise le : <strong>${new Date(facture.date_emission).toLocaleDateString('fr-FR')}</strong> &nbsp;|&nbsp;
    Statut : <span class="badge ${facture.abonnement.statut}">${facture.abonnement.statut.toUpperCase()}</span>
  </div>

  <div class="section">
    <h3>Informations client</h3>
    <p><strong>${facture.structure.nom ?? '—'}</strong><br/>
    ${facture.structure.email ?? ''} &nbsp; ${facture.structure.telephone ?? ''}<br/>
    ${facture.structure.adresse ?? ''}</p>
  </div>

  <div class="section">
    <h3>Période d'abonnement</h3>
    <p>Plan : <strong>${facture.abonnement.plan.replace('_', ' ').toUpperCase()}</strong><br/>
    Du <strong>${new Date(facture.abonnement.date_debut).toLocaleDateString('fr-FR')}</strong>
    au <strong>${new Date(facture.abonnement.date_fin).toLocaleDateString('fr-FR')}</strong></p>
  </div>

  <div class="section">
    <h3>Détail de facturation</h3>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr></thead>
      <tbody>
        <tr>
          <td>Plan de base — ${facture.abonnement.plan.replace('_', ' ')}</td>
          <td style="text-align:right">${facture.detail.plan_base.montant.toLocaleString()} ${facture.detail.devise}</td>
        </tr>
        ${lignesBoutiques}
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align:right">${facture.detail.total.toLocaleString()} ${facture.detail.devise}</td>
        </tr>
      </tbody>
    </table>
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
