import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionCaisse, FondParMode } from './entities/session-caisse.entity';
import { MouvementCaisse } from './entities/mouvement-caisse.entity';
import { Caisse } from './entities/caisse.entity';
import { OuvrirCaisseDto } from './dto/ouvrir-caisse.dto';
import { FermerCaisseDto } from './dto/fermer-caisse.dto';
import { MouvementCaisseDto } from './dto/mouvement-caisse.dto';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { TenantContextService } from 'src/tenant/tenant-context.service';

const MODES = [
  'espece', 'mobile_money', 'orange_money', 'wave', 'mtn_money', 'moov_money', 'dajmo',
  'carte', 'credit', 'mixte',
] as const;

@Injectable()
export class SessionCaisseService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get sessionRepo() { return this.dataSource.getRepository(SessionCaisse); }
  private get mouvementRepo() { return this.dataSource.getRepository(MouvementCaisse); }

  /** Retourne les montants des ventes mixte décomposés par sous-mode de paiement. */
  private async expandMixteAmounts(
    boutiqueId: number,
    dateOuverture: Date,
    dateFermeture?: Date | null,
  ): Promise<Record<string, number>> {
    const amounts: Record<string, number> = {};
    const rows = await this.dataSource.query(
      `SELECT r_details_paiement
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND created_at >= $2
         AND ($3::timestamp IS NULL OR created_at <= $3)
         AND deleted_at IS NULL
         AND r_mode_paiement = 'mixte'`,
      [boutiqueId, dateOuverture, dateFermeture ?? null],
    );
    for (const row of rows) {
      const details: Record<string, number> = row.r_details_paiement ?? {};
      for (const [mode, amount] of Object.entries(details)) {
        amounts[mode] = (amounts[mode] ?? 0) + Number(amount);
      }
    }
    return amounts;
  }

  /**
   * Résout un caissier par id (tenant) OU par téléphone.
   * Le front peut envoyer l'un ou l'autre — les deux sont acceptés.
   */
  private async resolveCaissier(valeur: string | number): Promise<Utilisateur> {
    const repo = this.dataSource.getRepository(Utilisateur);
    const asStr = String(valeur).trim();
    const asId  = parseInt(asStr, 10);

    // Priorité id numérique (tenant DB, pas de collision avec master ici)
    if (!isNaN(asId)) {
      const byId = await repo.findOne({ where: { id: asId } });
      if (byId) return byId;
    }

    // Fallback téléphone
    const byTel = await repo.findOne({ where: { telephone: asStr } });
    if (byTel) return byTel;

    throw new BadRequestException('Caissier introuvable');
  }

  async ouvrir(dto: OuvrirCaisseDto): Promise<SessionCaisse> {
    const boutique = await this.dataSource.getRepository(Boutique).findOne({
      where: { id: dto.boutique },
    });
    if (!boutique) throw new BadRequestException('Boutique introuvable');
    if (!boutique.gestion_caisse_activee) {
      throw new BadRequestException(
        "La gestion de caisse n'est pas activée pour cette boutique. Activez-la dans les paramètres.",
      );
    }

    const caissier = await this.resolveCaissier(dto.caissier);

    // Validation caisse physique
    let caisseEntity: Caisse | null = null;
    if (dto.caisse_id) {
      caisseEntity = await this.dataSource.getRepository(Caisse).findOne({
        where: { id: dto.caisse_id, boutique: { id: dto.boutique } },
      });
      if (!caisseEntity) throw new BadRequestException('Caisse introuvable');
      if (caisseEntity.statut !== 'ACTIVE') {
        throw new BadRequestException("Cette caisse est inactive. Activez-la avant d'ouvrir une session.");
      }
      const sessionSurCaisse = await this.sessionRepo.findOne({
        where: { caisse: { id: dto.caisse_id }, statut: 'ouverte' },
      });
      if (sessionSurCaisse) {
        throw new BadRequestException(
          `Cette caisse a déjà une session ouverte (réf: ${sessionSurCaisse.reference}).`,
        );
      }
    } else {
      // Ancien comportement : une session par caissier
      const existante = await this.sessionRepo.findOne({
        where: { boutique: { id: dto.boutique }, caissier: { id: caissier.id }, statut: 'ouverte' },
      });
      if (existante) {
        throw new BadRequestException(
          `Vous avez déjà une session de caisse ouverte (réf: ${existante.reference}). Fermez-la avant d'en ouvrir une nouvelle.`,
        );
      }
    }

    const session = this.sessionRepo.create({
      reference:      ReferenceGeneratorHelper.generate('CSE'),
      fond_ouverture: dto.fond_ouverture,
      statut:         'ouverte',
      date_ouverture: new Date(),
      boutique:       { id: dto.boutique } as any,
      caissier:       { id: caissier.id }  as any,
      caisse:         caisseEntity ? ({ id: caisseEntity.id } as any) : null,
    });
    return this.sessionRepo.save(session);
  }

  async fermer(id: number, dto: FermerCaisseDto, caissierTelephone?: string): Promise<SessionCaisse> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['mouvements', 'boutique', 'caissier'],
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session.statut === 'fermee') {
      throw new BadRequestException('Cette session est déjà fermée');
    }
    if (caissierTelephone && session.caissier?.telephone !== caissierTelephone) {
      throw new BadRequestException('Vous ne pouvez fermer que votre propre session de caisse.');
    }

    // Ventes par mode de paiement pendant la session
    const ventesResult = await this.dataSource.query(
      `SELECT
         r_mode_paiement AS mode,
         COALESCE(SUM(r_montant_total_apres_remise), 0) AS total
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND created_at >= $2
         AND deleted_at IS NULL
       GROUP BY r_mode_paiement`,
      [session.boutique.id, session.date_ouverture],
    );

    const venteParMode: Record<string, number> = {};
    for (const row of ventesResult) {
      venteParMode[row.mode] = parseFloat(row.total);
    }

    // Éclater les ventes mixte : distribuer chaque sous-montant dans le bon mode
    const mixteAmounts = await this.expandMixteAmounts(session.boutique.id, session.date_ouverture);
    if (Object.keys(mixteAmounts).length > 0) {
      delete venteParMode['mixte'];
      for (const [mode, amount] of Object.entries(mixteAmounts)) {
        venteParMode[mode] = (venteParMode[mode] ?? 0) + amount;
      }
    }

    // Mouvements manuels par mode
    const mouvParMode: Record<string, { entrees: number; sorties: number }> = {};
    for (const m of session.mouvements) {
      const mode = m.mode_paiement || 'espece';
      if (!mouvParMode[mode]) mouvParMode[mode] = { entrees: 0, sorties: 0 };
      if (m.type === 'entree') mouvParMode[mode].entrees += m.montant;
      else mouvParMode[mode].sorties += m.montant;
    }

    // Calcul montant_theorique et ecart par mode
    const montant_theorique: FondParMode = {};
    const ecart: FondParMode = {};

    for (const mode of MODES) {
      const fondOuv = (session.fond_ouverture as any)?.[mode] ?? 0;
      const ventes = venteParMode[mode] ?? 0;
      const entrees = mouvParMode[mode]?.entrees ?? 0;
      const sorties = mouvParMode[mode]?.sorties ?? 0;
      const theorique = fondOuv + ventes + entrees - sorties;
      const ferme = (dto.fond_fermeture as any)?.[mode] ?? 0;

      montant_theorique[mode] = theorique;
      ecart[mode] = ferme - theorique;
    }

    // update() explicite pour forcer TypeORM à persister les colonnes JSONB
    await this.sessionRepo.update(id, {
      statut: 'fermee',
      fond_fermeture: dto.fond_fermeture as any,
      montant_theorique: montant_theorique as any,
      ecart: ecart as any,
      date_fermeture: new Date(),
      notes: dto.notes ?? null,
    });

    return this.sessionRepo.findOne({
      where: { id },
      relations: ['caissier', 'boutique'],
    }) as Promise<SessionCaisse>;
  }

  async ajouterMouvement(
    sessionId: number,
    dto: MouvementCaisseDto,
  ): Promise<MouvementCaisse> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session.statut === 'fermee') {
      throw new BadRequestException(
        "Impossible d'ajouter un mouvement à une session fermée",
      );
    }

    let caissier: Utilisateur | null = null;
    if (dto.caissier) {
      caissier = await this.resolveCaissier(dto.caissier);
    }

    const mouvement = this.mouvementRepo.create({
      type: dto.type,
      motif: dto.motif,
      montant: dto.montant,
      mode_paiement: dto.mode_paiement ?? 'espece',
      session: { id: sessionId } as any,
      caissier: caissier ? ({ id: caissier.id } as any) : null,
    });
    return this.mouvementRepo.save(mouvement);
  }

  async getSessionActive(boutiqueId: number, caissierTelephone?: string): Promise<SessionCaisse | null> {
    let caissierWhere = {};
    if (caissierTelephone) {
      try {
        const caissier = await this.resolveCaissier(caissierTelephone);
        caissierWhere = { caissier: { id: caissier.id } };
      } catch { /* pas de filtre caissier si introuvable */ }
    }
    return this.sessionRepo.findOne({
      where: { boutique: { id: boutiqueId }, statut: 'ouverte', ...caissierWhere },
    });
  }

  async getRapport(sessionId: number): Promise<any> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['mouvements', 'boutique', 'caissier', 'mouvements.caissier'],
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const ventesResult = await this.dataSource.query(
      `SELECT
         r_mode_paiement AS mode,
         COUNT(*) AS nbre,
         COALESCE(SUM(r_montant_total_apres_remise), 0) AS total
       FROM t_ventes
       WHERE "boutiqueId" = $1
         AND created_at >= $2
         AND ($3::timestamp IS NULL OR created_at <= $3)
         AND deleted_at IS NULL
       GROUP BY r_mode_paiement`,
      [session.boutique.id, session.date_ouverture, session.date_fermeture],
    );

    const ventesParMode: Record<string, { nbre: number; total: number }> = {};
    let totalVentes = 0;
    let nbreVentes = 0;
    for (const row of ventesResult) {
      ventesParMode[row.mode] = { nbre: parseInt(row.nbre), total: parseFloat(row.total) };
      totalVentes += parseFloat(row.total);
      nbreVentes += parseInt(row.nbre);
    }

    // Éclater les ventes mixte dans les sous-modes (orange_money, wave, etc.)
    const mixteAmounts = await this.expandMixteAmounts(
      session.boutique.id, session.date_ouverture, session.date_fermeture,
    );
    if (Object.keys(mixteAmounts).length > 0) {
      delete ventesParMode['mixte'];
      for (const [mode, amount] of Object.entries(mixteAmounts)) {
        if (!ventesParMode[mode]) ventesParMode[mode] = { nbre: 0, total: 0 };
        ventesParMode[mode].total += amount;
      }
    }

    const mouvParMode: Record<string, { entrees: number; sorties: number }> = {};
    let totalEntrees = 0;
    let totalSorties = 0;
    for (const m of session.mouvements) {
      const mode = m.mode_paiement || 'espece';
      if (!mouvParMode[mode]) mouvParMode[mode] = { entrees: 0, sorties: 0 };
      if (m.type === 'entree') { mouvParMode[mode].entrees += m.montant; totalEntrees += m.montant; }
      else { mouvParMode[mode].sorties += m.montant; totalSorties += m.montant; }
    }

    // Calcul du montant théorique en temps réel (session ouverte ou fermée)
    const venteParModeSimple: Record<string, number> = {};
    for (const [mode, val] of Object.entries(ventesParMode)) {
      venteParModeSimple[mode] = val.total;
    }
    const montant_theorique_calcule: FondParMode = {};
    for (const mode of MODES) {
      const fondOuv = (session.fond_ouverture as any)?.[mode] ?? 0;
      const ventes = venteParModeSimple[mode] ?? 0;
      const entrees = mouvParMode[mode]?.entrees ?? 0;
      const sorties = mouvParMode[mode]?.sorties ?? 0;
      montant_theorique_calcule[mode] = fondOuv + ventes + entrees - sorties;
    }

    // Pour une session fermée, utiliser les valeurs stockées ; ouverte → calculées en temps réel
    const montant_theorique = session.statut === 'fermee'
      ? session.montant_theorique
      : montant_theorique_calcule;

    return {
      session: {
        id: session.id,
        reference: session.reference,
        statut: session.statut,
        date_ouverture: session.date_ouverture,
        date_fermeture: session.date_fermeture,
        caissier: session.caissier,
        boutique: session.boutique,
        notes: session.notes,
      },
      fond_ouverture: session.fond_ouverture,
      ventes: { nbre_total: nbreVentes, total: totalVentes, par_mode: ventesParMode },
      mouvements: { total_entrees: totalEntrees, total_sorties: totalSorties, par_mode: mouvParMode, detail: session.mouvements },
      recap: {
        fond_ouverture: session.fond_ouverture,
        montant_theorique,
        fond_fermeture: session.fond_fermeture,
        ecart: session.statut === 'fermee' ? session.ecart : null,
      },
    };
  }

  async getMontantTheorique(sessionId: number): Promise<any> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['mouvements', 'boutique'],
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const ventesResult = await this.dataSource.query(
      `SELECT r_mode_paiement AS mode, COALESCE(SUM(r_montant_total_apres_remise), 0) AS total
       FROM t_ventes
       WHERE "boutiqueId" = $1 AND created_at >= $2 AND deleted_at IS NULL
       GROUP BY r_mode_paiement`,
      [session.boutique.id, session.date_ouverture],
    );

    const venteParMode: Record<string, number> = {};
    for (const row of ventesResult) venteParMode[row.mode] = parseFloat(row.total);

    // Éclater les ventes mixte dans les sous-modes
    const mixteAmountsT = await this.expandMixteAmounts(session.boutique.id, session.date_ouverture);
    if (Object.keys(mixteAmountsT).length > 0) {
      delete venteParMode['mixte'];
      for (const [mode, amount] of Object.entries(mixteAmountsT)) {
        venteParMode[mode] = (venteParMode[mode] ?? 0) + amount;
      }
    }

    const mouvParMode: Record<string, { entrees: number; sorties: number }> = {};
    for (const m of session.mouvements) {
      const mode = m.mode_paiement || 'espece';
      if (!mouvParMode[mode]) mouvParMode[mode] = { entrees: 0, sorties: 0 };
      if (m.type === 'entree') mouvParMode[mode].entrees += m.montant;
      else mouvParMode[mode].sorties += m.montant;
    }

    const theorique: Record<string, number> = {};
    for (const mode of MODES) {
      const fondOuv = (session.fond_ouverture as any)?.[mode] ?? 0;
      const ventes = venteParMode[mode] ?? 0;
      const entrees = mouvParMode[mode]?.entrees ?? 0;
      const sorties = mouvParMode[mode]?.sorties ?? 0;
      theorique[mode] = fondOuv + ventes + entrees - sorties;
    }

    return {
      session_id: sessionId,
      fond_ouverture: session.fond_ouverture,
      ventes_par_mode: venteParMode,
      mouvements_par_mode: mouvParMode,
      montant_theorique: theorique,
    };
  }

  async findAll(query: { boutique: number; page?: number; limit?: number; caissier?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    let caissierWhere = {};
    if (query.caissier) {
      try {
        const caissier = await this.resolveCaissier(query.caissier);
        caissierWhere = { caissier: { id: caissier.id } };
      } catch { /* pas de filtre si caissier introuvable */ }
    }

    const [items, total] = await this.sessionRepo.findAndCount({
      where: { boutique: { id: query.boutique }, ...caissierWhere },
      relations: ['caissier', 'caisse'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
