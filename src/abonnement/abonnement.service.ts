import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Abonnement, PlanAbonnement, StatutAbonnement } from './entities/abonnement.entity';
import { PlanTarif, PlanType } from './entities/plan-tarif.entity';
import { BoutiqueAbonnement } from './entities/boutique-abonnement.entity';
import { ConfigTarif, TypeTarif } from './entities/config-tarif.entity';
import { FraisSetup } from './entities/frais-setup.entity';
import { CategorieStructure } from './entities/categorie-structure.entity';
import { PlanTarifCategorie } from './entities/plan-tarif-categorie.entity';
import { SouscrireAbonnementDto } from './dto/souscrire-abonnement.dto';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { Not } from 'typeorm';

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

const PLAN_ORDER: PlanType[] = ['1_mois', '3_mois', '6_mois', '1_an'];

function sortByPlan<T extends { plan: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => PLAN_ORDER.indexOf(a.plan as PlanType) - PLAN_ORDER.indexOf(b.plan as PlanType));
}

/** Prix mensuel de référence par catégorie (XOF) — Côte d'Ivoire */
const TARIF_MENSUEL_PAR_CATEGORIE: Record<string, number> = {
  'Épicerie / Boutique de quartier': 5000,
  'Maquis / Gargote':                5000,
  'Café / Bar':                       5000,
  'Salon de coiffure / Barbier':      5000,
  'Boulangerie / Pâtisserie':         6000,
  'Fast-food / Snack':                6000,
  'Poissonnerie':                     6000,
  'Pressing / Blanchisserie':         6000,
  'Boucherie / Charcuterie':          8000,
  'Boutique de vêtements':            8000,
  'Cosmétique / Beauté':              8000,
  'Droguerie':                        8000,
  'Papeterie / Librairie':            8000,
  'Superette':                       10000,
  'Quincaillerie':                   10000,
  'Pharmacie vétérinaire':           10000,
  'Électronique / High-tech':        15000,
  'Restaurant':                      15000,
  'Supermarché':                     15000,
  'Matériaux de construction':       20000,
  'Pharmacie':                       20000,
  'Station-service / Carburant':     20000,
  'Clinique / Cabinet médical':      25000,
  'Grossiste alimentaire':           30000,
  'Grossiste non alimentaire':       30000,
  'Importateur / Distributeur':      40000,
};

/** Taux de réduction appliqué selon la durée du plan */
const TAUX_REDUCTION_PLAN: Record<PlanType, number> = {
  '1_mois': 0,
  '3_mois': 0.05,
  '6_mois': 0.10,
  '1_an':   0.17,
};

function calculerMontantPlan(prixMensuel: number, plan: PlanType): number {
  const duree  = DUREE_PLAN[plan];
  const remise = TAUX_REDUCTION_PLAN[plan];
  return Math.round(prixMensuel * duree * (1 - remise));
}

const CATEGORIES_SEED: { label: string; ordre: number }[] = [
  // Commerce alimentaire
  { label: 'Superette',                      ordre:  1 },
  { label: 'Supermarché',                    ordre:  2 },
  { label: 'Épicerie / Boutique de quartier', ordre: 3 },
  { label: 'Boulangerie / Pâtisserie',       ordre:  4 },
  { label: 'Boucherie / Charcuterie',        ordre:  5 },
  { label: 'Poissonnerie',                   ordre:  6 },
  { label: 'Pharmacie',                      ordre:  7 },
  // Restauration
  { label: 'Restaurant',                     ordre: 10 },
  { label: 'Fast-food / Snack',              ordre: 11 },
  { label: 'Café / Bar',                     ordre: 12 },
  { label: 'Maquis / Gargote',               ordre: 13 },
  // Commerce non alimentaire
  { label: 'Boutique de vêtements',          ordre: 20 },
  { label: 'Quincaillerie',                  ordre: 21 },
  { label: 'Papeterie / Librairie',          ordre: 22 },
  { label: 'Électronique / High-tech',       ordre: 23 },
  { label: 'Cosmétique / Beauté',            ordre: 24 },
  { label: 'Matériaux de construction',      ordre: 25 },
  { label: 'Droguerie',                      ordre: 26 },
  // Services
  { label: 'Salon de coiffure / Barbier',    ordre: 30 },
  { label: 'Pressing / Blanchisserie',       ordre: 31 },
  { label: 'Clinique / Cabinet médical',     ordre: 32 },
  { label: 'Pharmacie vétérinaire',          ordre: 33 },
  { label: 'Station-service / Carburant',    ordre: 34 },
  // Grossiste / Distribution
  { label: 'Grossiste alimentaire',          ordre: 40 },
  { label: 'Grossiste non alimentaire',      ordre: 41 },
  { label: 'Importateur / Distributeur',     ordre: 42 },
];

@Injectable()
export class AbonnementService implements OnApplicationBootstrap {
  // Cache statut par structureId — TTL 5 minutes
  private readonly cache = new Map<number, { statut: StatutAbonnement | 'aucun'; cachedAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Abonnement)          private readonly abonnementRepo:        Repository<Abonnement>,
    @InjectRepository(PlanTarif)           private readonly planTarifRepo:         Repository<PlanTarif>,
    @InjectRepository(BoutiqueAbonnement)  private readonly boutiqueAboRepo:       Repository<BoutiqueAbonnement>,
    @InjectRepository(ConfigTarif)         private readonly configTarifRepo:       Repository<ConfigTarif>,
    @InjectRepository(FraisSetup)          private readonly fraisSetupRepo:        Repository<FraisSetup>,
    @InjectRepository(CategorieStructure)  private readonly categorieRepo:         Repository<CategorieStructure>,
    @InjectRepository(PlanTarifCategorie)  private readonly planTarifCatRepo:      Repository<PlanTarifCategorie>,
    @InjectRepository(Structure)           private readonly structureRepo:         Repository<Structure>,
  ) {}

  // ─── Seed catégories au démarrage ────────────────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategories();
    await this.seedTarifsCategories();
  }

  private async seedCategories(): Promise<void> {
    const existing = await this.categorieRepo.find({ select: ['label'] });
    const existingLabels = new Set(existing.map(c => c.label));
    const toInsert = CATEGORIES_SEED.filter(c => !existingLabels.has(c.label));
    if (toInsert.length > 0) {
      await this.categorieRepo.save(
        toInsert.map(c => this.categorieRepo.create({ ...c, est_actif: true })),
      );
    }
  }

  private async seedTarifsCategories(): Promise<void> {
    const categories = await this.categorieRepo.find();
    const existingTarifs = await this.planTarifCatRepo.find({ select: ['plan', 'categorieId'] });
    const existingSet = new Set(existingTarifs.map(t => `${t.plan}_${t.categorieId}`));

    const plans: PlanType[] = ['1_mois', '3_mois', '6_mois', '1_an'];
    const toInsert: PlanTarifCategorie[] = [];

    for (const cat of categories) {
      const prixMensuel = TARIF_MENSUEL_PAR_CATEGORIE[cat.label];
      if (!prixMensuel) continue;

      for (const plan of plans) {
        if (existingSet.has(`${plan}_${cat.id}`)) continue;
        toInsert.push(
          this.planTarifCatRepo.create({
            plan,
            categorieId: +cat.id,
            montant: calculerMontantPlan(prixMensuel, plan),
            devise: 'XOF',
            est_actif: true,
          }),
        );
      }
    }

    if (toInsert.length > 0) {
      await this.planTarifCatRepo.save(toInsert);
    }
  }

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
    const maintenant = new Date();
    const statut: StatutAbonnement = isSuperAdmin ? 'actif' : 'en_attente';

    // Déterminer si c'est une extension (abonnement actif existant) AVANT de calculer le devis
    let date_debut = maintenant;
    let isExtension = false;
    if (isSuperAdmin) {
      const courant = await this.abonnementRepo.findOne({
        where: { structureId: dto.structureId },
        order: { date_fin: 'DESC' },
      });
      isExtension = !!(courant?.statut === 'actif' && courant.date_fin > maintenant);
      if (isExtension) {
        date_debut = courant!.date_fin;
      }
    }

    // Frais de mise en place : toujours inclus pour le super admin (nouvelle souscription ou renouvellement)
    const devis = await this.calculerDevisRenouvellement(dto.structureId, dto.plan, isSuperAdmin);

    // Calcul de la remise
    let montantFinal = dto.montant ?? devis.total;
    let remise_detail: Abonnement['remise_detail'] = null;

    if (dto.remise_type && dto.remise_valeur != null && dto.remise_valeur > 0) {
      const montant_remise = dto.remise_type === 'pourcentage'
        ? Math.round(devis.total * dto.remise_valeur / 100)
        : dto.remise_valeur;
      montantFinal = Math.max(0, devis.total - montant_remise);
      remise_detail = { type: dto.remise_type, valeur: dto.remise_valeur, montant_remise };
    } else if (dto.montant != null && dto.montant < devis.total) {
      // Montant personnalisé sans remise explicite → on déduit la remise pour garder la cohérence de la facture
      const montant_remise = devis.total - dto.montant;
      remise_detail = { type: 'montant', valeur: montant_remise, montant_remise };
    }

    const abo = this.abonnementRepo.create({
      structureId:        dto.structureId,
      plan:               dto.plan as PlanAbonnement,
      date_debut,
      date_fin:           addMonths(date_debut, DUREE_PLAN[dto.plan]),
      statut,
      montant:            montantFinal,
      devise:             devis.devise,
      notes:              dto.notes ?? null,
      frais_setup_detail: devis.frais_setup.length > 0 ? devis.frais_setup : null,
      remise_detail,
    });

    const saved = await this.abonnementRepo.save(abo);
    this.invalidateCache(dto.structureId);
    return { ...saved, devis } as any;
  }

  // ─── Validation super_admin ───────────────────────────────────────────────

  async validerAbonnement(
    id: number,
    remise?: { remise_type?: 'montant' | 'pourcentage'; remise_valeur?: number },
  ): Promise<Abonnement> {
    const abo = await this.abonnementRepo.findOne({ where: { id } });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    if (abo.statut !== 'en_attente') {
      throw new BadRequestException(`Cet abonnement n'est pas en attente de validation (statut actuel : ${abo.statut})`);
    }

    const maintenant = new Date();
    const courant = await this.abonnementRepo.findOne({
      where: { structureId: abo.structureId, statut: 'actif' },
      order: { date_fin: 'DESC' },
    });
    const date_debut = courant && courant.date_fin > maintenant ? courant.date_fin : maintenant;
    const date_fin   = addMonths(date_debut, DUREE_PLAN[abo.plan as PlanType]);

    const updates: Partial<Abonnement> = { statut: 'actif', date_debut, date_fin };

    if (remise?.remise_type && remise.remise_valeur != null && remise.remise_valeur > 0) {
      const montant_remise = remise.remise_type === 'pourcentage'
        ? Math.round(abo.montant * remise.remise_valeur / 100)
        : remise.remise_valeur;
      updates.montant = Math.max(0, abo.montant - montant_remise);
      updates.remise_detail = { type: remise.remise_type, valeur: remise.remise_valeur, montant_remise };
    }

    await this.abonnementRepo.update(id, updates as any);
    this.invalidateCache(abo.structureId);
    return { ...abo, ...updates };
  }

  // ─── Frais de mise en place (1er abonnement) ─────────────────────────────

  async getFraisSetup(): Promise<FraisSetup[]> {
    return this.fraisSetupRepo.find({ order: { ordre: 'ASC', id: 'ASC' } });
  }

  async upsertFraisSetup(id: number | null, dto: { label: string; montant: number; devise?: string; est_actif?: boolean; ordre?: number }): Promise<FraisSetup> {
    if (id) {
      const existing = await this.fraisSetupRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Frais introuvable');
      await this.fraisSetupRepo.update(id, dto);
      return { ...existing, ...dto } as FraisSetup;
    }
    return this.fraisSetupRepo.save(this.fraisSetupRepo.create({ devise: 'XOF', est_actif: true, ordre: 0, ...dto }));
  }

  async deleteFraisSetup(id: number): Promise<void> {
    await this.fraisSetupRepo.delete(id);
  }

  // ─── Catégories de structures ─────────────────────────────────────────────

  async getCategories(): Promise<(CategorieStructure & { tarifs: PlanTarifCategorie[] })[]> {
    const cats = await this.categorieRepo.find({ order: { ordre: 'ASC', label: 'ASC' } });
    return Promise.all(cats.map(async c => ({
      ...c,
      tarifs: sortByPlan(await this.planTarifCatRepo.find({ where: { categorieId: c.id } })),
    })));
  }

  async upsertCategorie(
    id: number | null,
    dto: { label: string; description?: string; est_actif?: boolean; ordre?: number },
  ): Promise<CategorieStructure> {
    if (id) {
      const existing = await this.categorieRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Catégorie introuvable');
      await this.categorieRepo.update(id, dto);
      return { ...existing, ...dto } as CategorieStructure;
    }
    return this.categorieRepo.save(this.categorieRepo.create({ est_actif: true, ordre: 0, ...dto }));
  }

  async deleteCategorie(id: number): Promise<void> {
    await this.planTarifCatRepo.delete({ categorieId: id });
    await this.categorieRepo.delete(id);
  }

  async getTarifsCategorie(categorieId: number): Promise<PlanTarifCategorie[]> {
    const tarifs = await this.planTarifCatRepo.find({ where: { categorieId } });
    return sortByPlan(tarifs);
  }

  async upsertTarifCategorie(
    categorieId: number,
    plan: PlanType,
    montant: number,
    devise = 'XOF',
  ): Promise<PlanTarifCategorie> {
    const existing = await this.planTarifCatRepo.findOne({ where: { categorieId, plan } });
    if (existing) {
      await this.planTarifCatRepo.update(existing.id, { montant, devise, est_actif: true });
      return { ...existing, montant, devise, est_actif: true };
    }
    return this.planTarifCatRepo.save(
      this.planTarifCatRepo.create({ categorieId, plan, montant, devise, est_actif: true }),
    );
  }

  async deleteTarifCategorie(categorieId: number, plan: PlanType): Promise<void> {
    await this.planTarifCatRepo.delete({ categorieId, plan });
  }

  /** Retourne true si la structure n'a jamais eu d'abonnement payant (hors essai). */
  private async estPremierAbonnement(structureId: number): Promise<boolean> {
    const count = await this.abonnementRepo.count({
      where: { structureId, plan: Not('essai' as PlanAbonnement) },
    });
    return count === 0;
  }

  async hasAbonnementActif(structureId: number): Promise<boolean> {
    const maintenant = new Date();
    const courant = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });
    return !!(courant?.statut === 'actif' && courant.date_fin > maintenant);
  }

  // ─── Devis de renouvellement ──────────────────────────────────────────────

  async calculerDevisRenouvellement(structureId: number, plan: PlanType, forceFrais = false): Promise<{
    plan: PlanType;
    prix_base: number;
    boutiques_incluses: number;
    boutiques_supplementaires: number;
    config_boutique: { valeur: number; type: TypeTarif };
    prix_boutique_supplementaire: number;
    montant_boutiques_supplementaires: number;
    frais_setup: { label: string; montant: number; devise: string }[];
    montant_frais_setup: number;
    est_premier_abonnement: boolean;
    total: number;
    devise: string;
    categorie_id: number | null;
    categorie_label: string | null;
    detail_boutiques: BoutiqueAbonnement[];
  }> {
    const planTarif  = await this.planTarifRepo.findOne({ where: { plan } });
    const structure  = await this.structureRepo.findOne({ where: { id: structureId } });
    const categorieId = structure?.categorieId ?? null;

    // Tarif catégorie > tarif par défaut
    let prixBase = planTarif?.montant ?? 0;
    let devise   = planTarif?.devise  ?? 'XOF';
    let categorieLabel: string | null = null;

    if (categorieId) {
      const tarifCat = await this.planTarifCatRepo.findOne({
        where: { plan, categorieId, est_actif: true },
      });
      if (tarifCat) {
        prixBase = tarifCat.montant;
        devise   = tarifCat.devise;
      }
      const cat = await this.categorieRepo.findOne({ where: { id: categorieId } });
      categorieLabel = cat?.label ?? null;
    }

    const boutiquesExtra = await this.boutiqueAboRepo.find({
      where: { structureId, est_active: true },
    });
    const nbExtra = boutiquesExtra.length;

    const config = await this.getConfigBoutiqueSupplementaire();
    const prixExtra = config.type === 'pourcentage'
      ? Math.round(prixBase * (config.valeur / 100))
      : config.valeur;
    const montantExtra = nbExtra * prixExtra;

    // Frais de mise en place : 1er abonnement payant, OU forcé par le super admin
    const estPremier = await this.estPremierAbonnement(structureId);
    const inclureFrais = estPremier || forceFrais;
    const fraisSetupItems = inclureFrais
      ? (await this.fraisSetupRepo.find({ where: { est_actif: true }, order: { ordre: 'ASC', id: 'ASC' } }))
          .map(f => ({ label: f.label, montant: f.montant, devise: f.devise }))
      : [];
    const montantFraisSetup = fraisSetupItems.reduce((s, f) => s + f.montant, 0);

    return {
      plan,
      prix_base: prixBase,
      boutiques_incluses: 1,
      boutiques_supplementaires: nbExtra,
      config_boutique: { valeur: config.valeur, type: config.type },
      prix_boutique_supplementaire: prixExtra,
      montant_boutiques_supplementaires: montantExtra,
      frais_setup: fraisSetupItems,
      montant_frais_setup: montantFraisSetup,
      est_premier_abonnement: estPremier,
      total: prixBase + montantExtra + montantFraisSetup,
      devise,
      categorie_id: categorieId,
      categorie_label: categorieLabel,
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
    // Si un plan payant actif existe, la structure n'est pas en essai
    const payant = await this.abonnementRepo.findOne({
      where: { structureId, statut: 'actif' as StatutAbonnement, plan: Not('essai' as PlanAbonnement) },
    });
    if (payant) return false;

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

    const maintenant = new Date();

    // Priorité : un abonnement actif dont la date de fin n'est pas encore passée.
    // Cela permet à un utilisateur qui a soumis un renouvellement (en_attente) de
    // continuer à utiliser l'application tant que son abonnement courant est valide.
    const aboActif = await this.abonnementRepo.findOne({
      where: { structureId, statut: 'actif' as StatutAbonnement },
      order: { date_fin: 'DESC' },
    });
    if (aboActif && aboActif.date_fin > maintenant) {
      return this.setCache(structureId, 'actif');
    }

    // Aucun abonnement actif valide : prendre le plus récent pour déterminer le statut
    const abo = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });

    if (!abo) return this.setCache(structureId, 'aucun');
    if (abo.statut === 'suspendu') return this.setCache(structureId, 'suspendu');
    if (abo.statut === 'en_attente') return this.setCache(structureId, 'en_attente');

    if (abo.date_fin < maintenant && abo.statut === 'actif') {
      await this.abonnementRepo.update(abo.id, { statut: 'expire' });
      return this.setCache(structureId, 'expire');
    }

    return this.setCache(structureId, abo.statut);
  }

  // ─── Lecture ──────────────────────────────────────────────────────────────

  async getAbonnement(structureId: number): Promise<any | null> {
    const maintenant = new Date();

    // Priorité : l'abonnement actif non expiré (même si un renouvellement en_attente existe)
    const aboActif = await this.abonnementRepo.findOne({
      where: { structureId, statut: 'actif' as StatutAbonnement },
      order: { date_fin: 'DESC' },
    });

    // Si un abonnement actif existe et n'est pas encore expiré, on le retourne
    // mais on indique s'il y a un renouvellement en attente
    if (aboActif && aboActif.date_fin > maintenant) {
      const enAttente = await this.abonnementRepo.findOne({
        where: { structureId, statut: 'en_attente' as StatutAbonnement },
        order: { created_at: 'DESC' },
      });
      const jours_restants = Math.max(0, Math.ceil((aboActif.date_fin.getTime() - maintenant.getTime()) / 86400000));
      const boutiques_supplementaires = await this.boutiqueAboRepo.count({ where: { structureId, est_active: true } });
      return { ...aboActif, jours_restants, boutiques_supplementaires, renouvellement_en_attente: !!enAttente };
    }

    // Pas d'abonnement actif valide : retourner le plus récent (en_attente, expire, etc.)
    const abo = await this.abonnementRepo.findOne({
      where: { structureId },
      order: { date_fin: 'DESC' },
    });
    if (!abo) return null;
    const jours_restants = Math.max(0, Math.ceil((abo.date_fin.getTime() - maintenant.getTime()) / 86400000));
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

    const fraisSetupDetail = abo.frais_setup_detail ?? [];
    const montantFraisSetup = fraisSetupDetail.reduce((s, f) => s + f.montant, 0);
    const remiseDetail = abo.remise_detail ?? null;
    const montantAvantRemise = remiseDetail
      ? abo.montant + remiseDetail.montant_remise
      : null;
    const montantPlanBase = (montantAvantRemise ?? abo.montant) - nbExtra * prixExtra - montantFraisSetup;

    return {
      reference,
      date_emission: new Date(),
      abonnement: {
        id: abo.id,
        plan: abo.plan,
        statut: abo.statut,
        date_debut: abo.date_debut,
        date_fin: abo.date_fin,
        est_premier_abonnement: fraisSetupDetail.length > 0,
      },
      structure: structure
        ? { id: structure.id, nom: structure.nom, telephone: structure.telephone, email: structure.email, adresse: structure.situation_geo }
        : { id: abo.structureId },
      detail: {
        plan_base: { label: `Plan ${abo.plan.replace('_', ' ')}`, montant: montantPlanBase, devise: abo.devise },
        boutiques_supplementaires: boutiquesExtra.map(b => ({
          boutiqueNom: b.boutiqueNom,
          est_active: b.est_active,
          prix_unitaire: prixExtra,
          config: { valeur: configExtra.valeur, type: configExtra.type },
          devise: abo.devise,
        })),
        nb_boutiques_facturees: nbExtra,
        montant_boutiques: nbExtra * prixExtra,
        frais_setup: fraisSetupDetail,
        montant_frais_setup: montantFraisSetup,
        remise: remiseDetail,
        montant_avant_remise: montantAvantRemise,
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

    const fraisSetupLines: any[] = facture.detail.frais_setup ?? [];
    const lignesFraisSetup = fraisSetupLines.map((f: any, i: number) =>
      `<tr style="background:${i % 2 === 0 ? '#fff8f0' : '#fef3e8'}">
        <td style="padding:10px 14px;border:1px solid #ddd;font-style:italic;">⚙ ${f.label}</td>
        <td style="padding:10px 14px;border:1px solid #ddd;text-align:right;white-space:nowrap;font-style:italic;">${fmt(f.montant, f.devise)}</td>
      </tr>`).join('');

    const remise = facture.detail.remise;
    const ligneRemise = remise
      ? `<tr style="background:#fef9ec;">
          <td style="padding:10px 14px;border:1px solid #ddd;font-style:italic;color:#b45309;">
            🏷 Réduction${remise.type === 'pourcentage' ? ` (${remise.valeur}%)` : ' (montant fixe)'}
          </td>
          <td style="padding:10px 14px;border:1px solid #ddd;text-align:right;white-space:nowrap;font-style:italic;color:#dc2626;">
            − ${fmt(remise.montant_remise, facture.detail.devise)}
          </td>
        </tr>`
      : '';

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
      ${lignesFraisSetup}
      ${lignesBoutiques}
      ${ligneRemise}
    </tbody>
  </table>

  <!-- Total -->
  <div class="totals">
    <table class="totals-table">
      ${remise ? `<tr>
        <td style="text-align:right;font-size:10pt;color:#6b7280;">Sous-total</td>
        <td style="text-align:right;font-size:10pt;color:#6b7280;white-space:nowrap;">${fmt(facture.detail.montant_avant_remise, facture.detail.devise)}</td>
      </tr>
      <tr>
        <td style="text-align:right;font-size:10pt;color:#dc2626;font-style:italic;">Réduction</td>
        <td style="text-align:right;font-size:10pt;color:#dc2626;font-style:italic;white-space:nowrap;">− ${fmt(remise.montant_remise, facture.detail.devise)}</td>
      </tr>` : ''}
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

    const fraisSetupLinesContrat: any[] = facture.detail.frais_setup ?? [];
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
        ${fraisSetupLinesContrat.map((f: any) =>
          `<tr><td style="font-style:italic;">⚙ ${f.label}</td><td style="font-style:italic;">${fmt(f.montant, f.devise)}</td></tr>`
        ).join('')}
        ${facture.detail.boutiques_supplementaires.filter((b: any) => b.est_active).map((b: any, i: number) => {
          const label = b.config?.type === 'pourcentage'
            ? `Boutique supplémentaire — ${b.boutiqueNom} (${b.config.valeur}% du plan)`
            : `Boutique supplémentaire — ${b.boutiqueNom}`;
          return `<tr><td>${label}</td><td>${fmt(b.prix_unitaire, b.devise)}</td></tr>`;
        }).join('')}
        ${facture.detail.remise ? `<tr style="color:#dc2626;font-style:italic;"><td>🏷 Réduction${facture.detail.remise.type === 'pourcentage' ? ` (${facture.detail.remise.valeur}%)` : ' (montant fixe)'}</td><td>− ${fmt(facture.detail.remise.montant_remise, facture.detail.devise)}</td></tr>` : ''}
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
    const plans = await this.planTarifRepo.find();
    return sortByPlan(plans);
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
