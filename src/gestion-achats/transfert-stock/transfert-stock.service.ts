import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { DetailVente } from 'src/gestion-ventes/detail-vente/entities/detail-vente.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { TransfertStock } from './entities/transfert-stock.entity';
import { LigneTransfertStock } from './entities/ligne-transfert-stock.entity';

@Injectable()
export class TransfertStockService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds() { return this.tenantContext.getDataSource(); }

  async create(dto: {
    boutique_source: number;
    boutique_destination: number;
    notes?: string;
    telephone?: string;
    lignes: { produit: number; quantite: number }[];
  }): Promise<TransfertStock> {
    if (!dto.lignes?.length) throw new BadRequestException('Aucune ligne de transfert');
    if (dto.boutique_source === dto.boutique_destination) {
      throw new BadRequestException('Source et destination ne peuvent pas être identiques');
    }

    return this.ds.transaction(async (manager) => {
      let utilisateur: Utilisateur | null = null;
      if (dto.telephone) {
        utilisateur = await manager.findOne(Utilisateur, { where: { telephone: dto.telephone } });
      }

      const transfert = manager.create(TransfertStock, {
        reference: ReferenceGeneratorHelper.generate('TRF'),
        statut: 'brouillon',
        boutique_source: { id: dto.boutique_source } as any,
        boutique_destination: { id: dto.boutique_destination } as any,
        notes: dto.notes ?? null,
        utilisateur,
      });
      const saved = await manager.save(transfert);

      const lignes = dto.lignes.map((l) =>
        manager.create(LigneTransfertStock, {
          transfert: saved,
          produit: { id: l.produit } as any,
          quantite: l.quantite,
        })
      );
      await manager.save(lignes);

      return manager.findOne(TransfertStock, {
        where: { id: saved.id },
        relations: ['lignes', 'lignes.produit'],
      }) as Promise<TransfertStock>;
    });
  }

  /** Valider = expédier depuis l'entrepôt → stock_disponible - qté sur les produits source */
  async valider(id: number): Promise<TransfertStock> {
    const transfert = await this.findOne(id);
    if (transfert.statut !== 'brouillon') {
      throw new BadRequestException('Seul un transfert brouillon peut être validé');
    }

    return this.ds.transaction(async (manager) => {
      const produitIds = transfert.lignes.map((l) => l.produit.id);
      const produits = await manager.findBy(Produit, { id: In(produitIds) });

      // Vérifier stock suffisant
      for (const ligne of transfert.lignes) {
        const p = produits.find((p) => p.id === ligne.produit.id);
        if (!p || p.stock_disponible < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour "${ligne.produit.nom}" (disponible: ${p?.stock_disponible ?? 0}, demandé: ${ligne.quantite})`,
          );
        }
      }

      // Décrémenter stock entrepôt + historique
      const historiques: Partial<HistoriqueStock>[] = [];
      for (const ligne of transfert.lignes) {
        const p = produits.find((p) => p.id === ligne.produit.id)!;
        historiques.push({
          produit: p,
          quantite: ligne.quantite,
          mouvement: 'sortie',
          source: 'transfert',
          stock_avant: p.stock_disponible,
          stock_apres: p.stock_disponible - ligne.quantite,
          utilisateur: transfert.utilisateur ?? undefined,
          transfert_id: transfert.id,
        } as any);
        p.stock_disponible -= ligne.quantite;
      }
      await manager.save(Produit, produits);
      await manager.save(manager.create(HistoriqueStock, historiques as any[]));

      await manager.update(TransfertStock, id, {
        statut: 'valide',
        date_envoi: new Date(),
      });

      return manager.findOne(TransfertStock, {
        where: { id },
        relations: ['lignes', 'lignes.produit'],
      }) as Promise<TransfertStock>;
    });
  }

  /** Réceptionner = arrivée en boutique → stock_disponible + qté sur les produits destination */
  async recevoir(id: number): Promise<TransfertStock> {
    const transfert = await this.findOne(id);
    if (transfert.statut !== 'valide') {
      throw new BadRequestException('Seul un transfert validé peut être réceptionné');
    }

    const destId = (transfert.boutique_destination as any)?.id ?? transfert.boutique_destination;

    return this.ds.transaction(async (manager) => {
      const historiques: Partial<HistoriqueStock>[] = [];

      for (const ligne of transfert.lignes) {
        // Trouver le produit de même nom dans la boutique de destination
        let produitDest = await manager
          .createQueryBuilder(Produit, 'p')
          .leftJoin('p.boutique', 'b')
          .where('b.id = :boutique', { boutique: destId })
          .andWhere('p.nom = :nom', { nom: ligne.produit.nom })
          .andWhere('p.deleted_at IS NULL')
          .getOne();

        // Si absent, le créer automatiquement en copiant les infos du produit source
        if (!produitDest) {
          produitDest = manager.create(Produit, {
            nom: ligne.produit.nom,
            prix_achat: ligne.produit.prix_achat,
            prix_vente: ligne.produit.prix_vente,
            stock_initial: 0,
            stock_physique: 0,
            stock_reserve: 0,
            stock_minimum: ligne.produit.stock_minimum ?? 0,
            stock_disponible: 0,
            seuil_alert: ligne.produit.seuil_alert ?? 2,
            unite_mesure: ligne.produit.unite_mesure ?? 'pièce',
            description: ligne.produit.description ?? null,
            categorie: ligne.produit.categorie ?? null,
            boutique: { id: destId } as any,
            image: null,
            code_barre: ligne.produit.code_barre ?? null,
          });
          produitDest = await manager.save(produitDest);
        }

        historiques.push({
          produit: produitDest,
          quantite: ligne.quantite,
          mouvement: 'entree',
          source: 'transfert',
          stock_avant: produitDest.stock_disponible,
          stock_apres: produitDest.stock_disponible + ligne.quantite,
          utilisateur: transfert.utilisateur ?? undefined,
          transfert_id: transfert.id,
        } as any);
        produitDest.stock_disponible += ligne.quantite;
        await manager.save(produitDest);
      }

      await manager.save(manager.create(HistoriqueStock, historiques as any[]));

      await manager.update(TransfertStock, id, {
        statut: 'recu',
        date_reception: new Date(),
      });

      return manager.findOne(TransfertStock, {
        where: { id },
        relations: ['lignes', 'lignes.produit'],
      }) as Promise<TransfertStock>;
    });
  }

  async findAll(query: {
    boutique_source?: number;
    boutique_destination?: number;
    boutique?: number;
    page?: number;
    limit?: number;
  }) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const qb = this.ds.getRepository(TransfertStock)
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.boutique_source', 'src')
      .leftJoinAndSelect('t.boutique_destination', 'dest')
      .leftJoinAndSelect('t.utilisateur', 'u')
      .leftJoinAndSelect('t.lignes', 'l')
      .leftJoinAndSelect('l.produit', 'p')
      .where('t.deleted_at IS NULL')
      .orderBy('t.created_at', 'DESC');

    if (query.boutique) {
      qb.andWhere('(src.id = :b OR dest.id = :b)', { b: query.boutique });
    }
    if (query.boutique_source) {
      qb.andWhere('src.id = :src', { src: query.boutique_source });
    }
    if (query.boutique_destination) {
      qb.andWhere('dest.id = :dest', { dest: query.boutique_destination });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<TransfertStock> {
    const t = await this.ds.getRepository(TransfertStock).findOne({
      where: { id },
      relations: ['boutique_source', 'boutique_destination', 'lignes', 'lignes.produit', 'utilisateur'],
    });
    if (!t) throw new NotFoundException('Transfert introuvable');
    return t;
  }

  async update(id: number, dto: {
    boutique_source?: number;
    boutique_destination?: number;
    notes?: string;
    lignes?: { produit: number; quantite: number }[];
  }): Promise<TransfertStock> {
    const transfert = await this.findOne(id);
    if (transfert.statut !== 'brouillon') {
      throw new BadRequestException('Seul un transfert brouillon peut être modifié');
    }

    return this.ds.transaction(async (manager) => {
      if (dto.boutique_source !== undefined) {
        (transfert as any).boutique_source = { id: dto.boutique_source };
      }
      if (dto.boutique_destination !== undefined) {
        (transfert as any).boutique_destination = { id: dto.boutique_destination };
      }
      if (dto.notes !== undefined) transfert.notes = dto.notes;
      await manager.save(transfert);

      if (dto.lignes) {
        await manager.delete(LigneTransfertStock, { transfert: { id } });
        const lignes = dto.lignes.map((l) =>
          manager.create(LigneTransfertStock, {
            transfert: { id } as any,
            produit: { id: l.produit } as any,
            quantite: l.quantite,
          })
        );
        await manager.save(lignes);
      }

      return this.findOne(id);
    });
  }

  async remove(id: number): Promise<void> {
    const transfert = await this.findOne(id);
    if (transfert.statut !== 'brouillon') {
      throw new BadRequestException('Seul un transfert brouillon peut être supprimé');
    }
    await this.ds.getRepository(TransfertStock).softDelete(id);
  }

  /** Rapport ventes par produits transférés vers une boutique destination */
  async rapportVentes(params: {
    boutiqueDestinationId: number;
    boutiqueSourceId?: number;
    dateDebut?: string;
    dateFin?: string;
  }) {
    // Étape 1 : quantités transférées par nom de produit
    const qbTransferts = this.ds
      .createQueryBuilder()
      .select('p.r_nom', 'produit_nom')
      .addSelect('SUM(l.r_quantite)', 'qte_transferee')
      .from(LigneTransfertStock, 'l')
      .innerJoin('l.transfert', 't')
      .innerJoin('l.produit', 'p')
      .where('t.r_statut = :statut', { statut: 'recu' })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.boutique_destination = :dest', { dest: params.boutiqueDestinationId });

    if (params.boutiqueSourceId) {
      qbTransferts.andWhere('t.boutique_source = :src', { src: params.boutiqueSourceId });
    }
    if (params.dateDebut) {
      qbTransferts.andWhere('t.r_date_reception >= :debut', { debut: params.dateDebut });
    }
    if (params.dateFin) {
      qbTransferts.andWhere('t.r_date_reception <= :fin', { fin: `${params.dateFin}T23:59:59` });
    }

    qbTransferts.groupBy('p.r_nom').orderBy('qte_transferee', 'DESC');
    const transfertRows: { produit_nom: string; qte_transferee: string }[] =
      await qbTransferts.getRawMany();

    if (!transfertRows.length) return [];

    const noms = transfertRows.map((r) => r.produit_nom);

    // Étape 2 : ventes de ces produits dans la boutique destination
    const qbVentes = this.ds
      .createQueryBuilder()
      .select('p.r_nom', 'produit_nom')
      .addSelect('p.r_stock_disponible', 'stock_restant')
      .addSelect('p.r_prix_vente', 'prix_vente')
      .addSelect('SUM(dv.r_quantite)', 'qte_vendue')
      .addSelect('SUM(dv.r_quantite * dv.r_prix_unitaire_vente)', 'ca_genere')
      .from(DetailVente, 'dv')
      .innerJoin('dv.vente', 'v')
      .innerJoin('dv.produit', 'p')
      .where('v.boutique = :boutiqueId', { boutiqueId: params.boutiqueDestinationId })
      .andWhere('v.deleted_at IS NULL')
      .andWhere('p.r_nom IN (:...noms)', { noms })
      .groupBy('p.r_nom')
      .addGroupBy('p.r_stock_disponible')
      .addGroupBy('p.r_prix_vente');

    if (params.dateDebut) {
      qbVentes.andWhere('v.created_at >= :debut', { debut: params.dateDebut });
    }
    if (params.dateFin) {
      qbVentes.andWhere('v.created_at <= :fin', { fin: `${params.dateFin}T23:59:59` });
    }

    const ventesRows: { produit_nom: string; stock_restant: string; prix_vente: string; qte_vendue: string; ca_genere: string }[] =
      await qbVentes.getRawMany();

    const ventesMap = new Map(ventesRows.map((r) => [r.produit_nom, r]));

    // Étape 3 : fusion
    return transfertRows.map((t) => {
      const v = ventesMap.get(t.produit_nom);
      const qte_transferee = Number(t.qte_transferee);
      const qte_vendue     = Number(v?.qte_vendue ?? 0);
      return {
        produit_nom:      t.produit_nom,
        prix_vente:       Number(v?.prix_vente ?? 0),
        qte_transferee,
        qte_vendue,
        stock_restant:    Number(v?.stock_restant ?? 0),
        ca_genere:        Number(v?.ca_genere ?? 0),
        taux_ecoulement:  qte_transferee > 0
          ? Math.round((qte_vendue / qte_transferee) * 1000) / 10
          : 0,
      };
    });
  }

  /** Rapprochement : résumé des transferts entre entrepôt et boutiques */
  async rapprochement(boutiqueSourceId: number) {
    const items = await this.ds.getRepository(TransfertStock)
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.boutique_destination', 'dest')
      .leftJoinAndSelect('t.lignes', 'l')
      .leftJoinAndSelect('l.produit', 'p')
      .where('t.boutique_source = :src', { src: boutiqueSourceId })
      .andWhere('t.deleted_at IS NULL')
      .orderBy('t.created_at', 'DESC')
      .getMany();

    return items.map((t) => ({
      id: t.id,
      reference: t.reference,
      statut: t.statut,
      destination: t.boutique_destination,
      date_envoi: t.date_envoi,
      date_reception: t.date_reception,
      nb_lignes: t.lignes?.length ?? 0,
      lignes: (t.lignes ?? []).map((l) => ({
        produit: l.produit?.nom,
        quantite: l.quantite,
      })),
    }));
  }
}
