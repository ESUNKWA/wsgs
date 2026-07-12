import { BadRequestException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { MenuJour } from 'src/gestion-restaurant/menu-jour/entities/menu-jour.entity';
import { Recette } from 'src/gestion-restaurant/recette/entities/recette.entity';
import { TableRestaurant } from 'src/gestion-restaurant/table/entities/table.entity';
import { CommandeTable } from 'src/gestion-restaurant/commande-table/entities/commande-table.entity';
import { LigneCommandeTable } from 'src/gestion-restaurant/commande-table/entities/ligne-commande-table.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { TenantService } from 'src/tenant/tenant.service';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { EventsService } from 'src/events/events.service';

const CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

@Injectable()
export class PublicMenuService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantService: TenantService,
    private readonly eventsService: EventsService,
  ) {}

  /** Cache boutique→structure pour éviter de rescanner les tenants à chaque requête */
  private readonly bsCache = new Map<number, number>();

  /**
   * Résout le DataSource tenant.
   * - Si structureId est valide, route directement.
   * - Sinon (anciens QR codes sans &structure=), scanne tous les tenants actifs.
   */
  private async getDs(boutiqueId: number, structureId?: number | null) {
    if (structureId && !isNaN(structureId)) {
      return this.tenantService.getDataSource(structureId);
    }

    if (this.bsCache.has(boutiqueId)) {
      return this.tenantService.getDataSource(this.bsCache.get(boutiqueId)!);
    }

    const configs = await this.tenantService.findAll();
    for (const cfg of configs) {
      try {
        const ds = await this.tenantService.getDataSource(cfg.structureId);
        const found = await ds.getRepository(Boutique).findOne({ where: { id: boutiqueId } });
        if (found) {
          this.bsCache.set(boutiqueId, cfg.structureId);
          return ds;
        }
      } catch { /* tenant indisponible, on passe au suivant */ }
    }

    throw new BadRequestException('Boutique introuvable');
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async getMenu(boutiqueId: number, structureId?: number | null) {
    const ds = await this.getDs(boutiqueId, structureId);

    const boutique = await ds.getRepository(Boutique).findOne({ where: { id: boutiqueId } });
    if (!boutique) throw new BadRequestException('Boutique introuvable');

    // Tables disponibles (libres ou occupées) pour la sélection client
    const tables = await ds.getRepository(TableRestaurant).find({
      where: { boutique: { id: boutiqueId } },
      order: { numero: 'ASC' },
    });

    // Menu du jour (plats)
    const menuJour = await ds.getRepository(MenuJour).findOne({
      where: { boutique: { id: boutiqueId }, date: this.today() },
      relations: ['recettes'],
    });

    // Toutes les recettes actives de la boutique avec compositions pour le stock
    const recettes = await ds.getRepository(Recette)
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.compositions', 'comp')
      .leftJoinAndSelect('comp.produit', 'produit')
      .where('r.boutique = :b', { b: boutiqueId })
      .andWhere('r.actif = true')
      .andWhere('r.deleted_at IS NULL')
      .orderBy('r.categorie').addOrderBy('r.nom')
      .getMany();

    const menuJourIds = new Set((menuJour?.recettes ?? []).map(r => r.id));

    // Plats = ceux du menu du jour si défini, sinon tous les plats actifs
    const plats = recettes
      .filter(r => !CATS_BOISSONS.includes(r.categorie ?? ''))
      .filter(r => !menuJour || menuJourIds.has(r.id))
      .map(r => this.sanitizeRecette(r));

    // Boissons = toutes les boissons disponibles en stock (stock > 0 si géré)
    const boissons = recettes
      .filter(r => CATS_BOISSONS.includes(r.categorie ?? ''))
      .filter(r => {
        const dispo = this.stockDispo(r);
        return !isFinite(dispo) || dispo > 0;  // masquer si rupture totale
      })
      .map(r => this.sanitizeRecette(r));

    return {
      boutique: { id: boutique.id, nom: (boutique as any).nom, logo: (boutique as any).logo },
      menuDuJour: !!menuJour,
      tables: tables.map(t => ({ id: t.id, numero: t.numero, nom: t.nom, statut: t.statut })),
      plats,
      boissons,
    };
  }

  /** Supprime les infos de stock/composition — le client ne doit pas voir les quantités */
  private sanitizeRecette(r: Recette) {
    return {
      id:         r.id,
      nom:        r.nom,
      description: r.description,
      categorie:  r.categorie,
      prix_vente: r.prix_vente,
    };
  }

  private stockDispo(r: Recette): number {
    if (!r.compositions?.length) return Infinity;
    return Math.min(...r.compositions.map(c =>
      Math.floor(((c.produit as any)?.stock_disponible ?? 0) / (c.quantite || 1))
    ));
  }

  async passerCommande(dto: {
    boutique: number;
    structure?: number;
    telephone: string;
    table?: number;
    lignes: { recette: number; quantite: number; prix_unitaire: number; note?: string }[];
  }) {
    if (!dto.telephone?.trim()) throw new BadRequestException('Numéro de téléphone requis');
    if (!dto.lignes?.length)    throw new BadRequestException('Panier vide');

    const ds = await this.getDs(dto.boutique, dto.structure);
    let createdId!: number;

    // Calculer le numéro d'ordre du jour avant la transaction
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = await ds.getRepository(CommandeTable)
      .createQueryBuilder('c')
      .select('COALESCE(MAX(c.numero_ordre), 0)', 'max')
      .where('c.boutique = :b', { b: dto.boutique })
      .andWhere('c.created_at >= :today', { today })
      .getRawOne<{ max: number }>();

    // Détecter si toutes les lignes sont des boissons → pas d'envoi en cuisine
    const recetteIds = dto.lignes.map(l => l.recette);
    const recettesCheck = await ds.getRepository(Recette).find({ where: { id: In(recetteIds) } });
    const toutBoissons = recettesCheck.length > 0 &&
      recettesCheck.every(r => CATS_BOISSONS.includes((r as any).categorie ?? ''));
    const statut = toutBoissons ? 'prete' : 'en_attente';
    const numeroOrdre = toutBoissons ? null : (last?.max ?? 0) + 1;

    await ds.transaction(async (manager) => {
      const ref = ReferenceGeneratorHelper.generate('CMD');

      const commande = manager.create(CommandeTable, {
        reference:    ref,
        statut:       statut as any,
        telephone:    dto.telephone.trim(),
        source:       'client' as any,
        boutique:     { id: dto.boutique },
        table:        dto.table ? { id: dto.table } : undefined,
        notes:        null,
        numero_ordre: numeroOrdre,
      } as any);
      const saved = await manager.save(commande);
      createdId = saved.id;

      const lignes = dto.lignes.map(l =>
        manager.create(LigneCommandeTable, {
          recette:       { id: l.recette },
          quantite:      l.quantite,
          prix_unitaire: l.prix_unitaire,
          note:          l.note ?? null,
          commande:      saved,
        })
      );
      await manager.save(lignes);

      const montant = dto.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
      await manager.update(CommandeTable, saved.id, { montant_total: montant });
    });

    // Charger la commande complète pour l'envoyer via SSE
    const commande = await ds.getRepository(CommandeTable).findOne({
      where: { id: createdId },
      relations: ['table', 'lignes', 'lignes.recette'],
    });
    this.eventsService.emit(dto.boutique, 'nouvelle_commande', commande);

    return { id: createdId, message: 'Commande envoyée — un serveur va vous prendre en charge.' };
  }

  async appelServeur(boutiqueId: number, structureId?: number, tableId?: number) {
    const ds = await this.getDs(boutiqueId, structureId);
    let table: TableRestaurant | null = null;
    if (tableId) {
      const repo = ds.getRepository(TableRestaurant);
      table = await repo.findOne({ where: { id: tableId, boutique: { id: boutiqueId } } });
      if (table) {
        await repo.update(tableId, { appel_serveur: true });
        // Recharger pour avoir les données à jour
        table = await repo.findOne({ where: { id: tableId } });
      }
    }
    this.eventsService.emit(boutiqueId, 'appel_serveur', { table, boutique_id: boutiqueId });
    return { message: 'Un serveur arrive dans quelques instants.' };
  }

  async acquitterAppel(tableId: number) {
    await this.tenantContext.getDataSource().getRepository(TableRestaurant).update(tableId, { appel_serveur: false });
    return { ok: true };
  }
}
