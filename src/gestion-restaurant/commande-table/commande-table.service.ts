import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandeTable, StatutCommandeTable } from './entities/commande-table.entity';
import { LigneCommandeTable } from './entities/ligne-commande-table.entity';
import { TableRestaurant } from '../table/entities/table.entity';
import { Recette } from '../recette/entities/recette.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class CommandeTableService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly eventsService: EventsService,
  ) {}

  private get ds() { return this.tenantContext.getDataSource(); }
  private get repo() { return this.ds.getRepository(CommandeTable); }

  async findAll(boutiqueId: number, statut?: string) {
    if (!boutiqueId) throw new BadRequestException('Boutique requise');
    const qb = this.repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.table', 'table')
      .leftJoinAndSelect('c.lignes', 'lignes')
      .leftJoinAndSelect('lignes.recette', 'recette')
      .leftJoinAndSelect('c.user', 'user')
      .where('c.boutique = :b', { b: boutiqueId })
      .andWhere('c.deleted_at IS NULL')
      // FIFO : numéro d'ordre croissant, puis date de création pour les commandes sans numéro
      .orderBy('c.numero_ordre', 'ASC', 'NULLS LAST')
      .addOrderBy('c.created_at', 'ASC');

    if (statut) qb.andWhere('c.statut = :statut', { statut });
    return qb.getMany();
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({
      where: { id },
      relations: ['table', 'lignes', 'lignes.recette', 'lignes.recette.compositions', 'lignes.recette.compositions.produit', 'boutique', 'user'],
    });
    if (!c) throw new NotFoundException('Commande introuvable');
    return c;
  }

  /** Prochain numéro d'ordre du jour pour une boutique (repart de 1 chaque jour) */
  private async prochainNumeroOrdre(boutiqueId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await this.repo
      .createQueryBuilder('c')
      .select('COALESCE(MAX(c.numero_ordre), 0)', 'max')
      .where('c.boutique = :b', { b: boutiqueId })
      .andWhere('c.created_at >= :today', { today })
      .getRawOne<{ max: number }>();
    return (result?.max ?? 0) + 1;
  }

  async create(dto: any) {
    let createdId!: number;
    await this.ds.transaction(async (manager) => {
      const telephone = String(dto.user ?? '').trim();
      let tenantUser: Utilisateur | null = null;
      if (telephone) {
        tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
      }

      const numeroOrdre = await this.prochainNumeroOrdre(+dto.boutique);

      const { lignes, ...commandeData } = dto;
      const commande = manager.create(CommandeTable, {
        ...commandeData,
        reference:    ReferenceGeneratorHelper.generate('CMD'),
        boutique:     { id: +dto.boutique },
        table:        dto.table ? { id: +dto.table } : null,
        user:         tenantUser ?? undefined,
        statut:       'en_cours',
        numero_ordre: numeroOrdre,
      } as any);
      const saved = await manager.save(commande);
      createdId = saved.id;

      if (lignes?.length) {
        const rows = lignes.map((l: any) =>
          manager.create(LigneCommandeTable, {
            recette:       { id: +l.recette },
            quantite:      +l.quantite,
            prix_unitaire: +l.prix_unitaire,
            note:          l.note ?? null,
            commande:      saved,
          })
        );
        await manager.save(rows);

        const montant = rows.reduce((s: number, l: any) => s + (+l.quantite) * (+l.prix_unitaire), 0);
        await manager.update(CommandeTable, saved.id, { montant_total: montant });
      }

      if (dto.table) {
        await manager.update(TableRestaurant, +dto.table, { statut: 'occupee' });
      }
    });
    return this.findOne(createdId);
  }

  async ajouterLignes(id: number, lignes: any[]) {
    const commande = await this.findOne(id);
    if (['payee', 'annulee'].includes(commande.statut)) {
      throw new BadRequestException('Impossible de modifier une commande terminée');
    }
    await this.ds.transaction(async (manager) => {
      const rows = lignes.map((l: any) =>
        manager.create(LigneCommandeTable, {
          recette:       { id: +l.recette },
          quantite:      +l.quantite,
          prix_unitaire: +l.prix_unitaire,
          note:          l.note ?? null,
          commande:      { id },
        })
      );
      await manager.save(rows);

      const totalLignes = [...commande.lignes, ...rows];
      const newTotal = totalLignes.reduce((s, l: any) => s + l.quantite * l.prix_unitaire, 0);
      await manager.update(CommandeTable, id, { montant_total: newTotal });
    });
    return this.findOne(id);
  }

  async changerStatut(id: number, statut: StatutCommandeTable) {
    const commande = await this.findOne(id);
    if (commande.statut === 'payee') throw new BadRequestException('Commande déjà payée');
    await this.repo.update(id, { statut });
    const updated = await this.findOne(id);
    this.eventsService.emit(
      (commande as any).boutique?.id ?? (commande as any).boutique,
      'statut_change',
      { id, statut },
    );
    return updated;
  }

  async encaisser(id: number, libererTable = false) {
    const commande = await this.findOne(id);
    if (commande.statut === 'payee') throw new BadRequestException('Commande déjà encaissée');
    if (commande.statut === 'annulee') throw new BadRequestException('Commande annulée');

    return this.ds.transaction(async (manager) => {
      // Calculer le montant total
      const montant = commande.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

      // Déduire le stock selon les compositions de chaque recette
      for (const ligne of commande.lignes) {
        const recette = await manager.findOne(Recette, {
          where: { id: ligne.recette.id },
          relations: ['compositions', 'compositions.produit'],
        });
        if (!recette?.compositions?.length) continue;

        for (const comp of recette.compositions) {
          const qteADeduire = comp.quantite * ligne.quantite;
          const produit = await manager.findOne(Produit, { where: { id: comp.produit.id } });
          if (!produit) continue;

          const newStock = Math.max(0, (produit.stock_disponible ?? 0) - qteADeduire);
          await manager.update(Produit, produit.id, { stock_disponible: newStock });

          // Historique stock
          const hist = manager.create(HistoriqueStock, {
            produit:    { id: produit.id },
            mouvement:  'sortie',
            source:     'vente',
            quantite:   qteADeduire,
            stock_avant: produit.stock_disponible ?? 0,
            stock_apres: newStock,
          } as any);
          await manager.save(hist);
        }
      }

      // Passer la commande en payée
      await manager.update(CommandeTable, id, { statut: 'payee', montant_total: montant });

      // Libérer la table uniquement si demandé
      if (libererTable && commande.table) {
        await manager.update(TableRestaurant, commande.table.id, { statut: 'libre' });
      }

      const boutiqueId = (commande as any).boutique?.id ?? (commande as any).boutique;
      this.eventsService.emit(boutiqueId, 'statut_change', { id, statut: 'payee' });

      return this.findOne(id);
    });
  }

  async remove(id: number) {
    const commande = await this.findOne(id);
    if (commande.statut === 'payee') throw new BadRequestException('Impossible de supprimer une commande payée');
    return this.repo.softDelete(id);
  }
}
