import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { RetourVente } from './entities/retour-vente.entity';
import { DetailRetourVente } from './entities/detail-retour-vente.entity';
import { CreateRetourVenteDto } from './dto/create-retour-vente.dto';

@Injectable()
export class RetourVenteService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds() { return this.tenantContext.getDataSource(); }

  async creerRetour(dto: CreateRetourVenteDto): Promise<RetourVente> {
    try {
      return await this.ds.transaction(async (manager) => {
        // 1. Résoudre l'utilisateur et vérifier son autorisation
        if (!dto.user) throw new BadRequestException('Utilisateur requis pour effectuer un retour');
        const tenantUser = await manager.findOne(Utilisateur, { where: { telephone: String(dto.user) } });
        if (!tenantUser) throw new NotFoundException('Utilisateur introuvable');
        if (!tenantUser.peut_faire_retour) {
          throw new BadRequestException(`L'utilisateur "${tenantUser.nom}" n'est pas autorisé à effectuer des retours`);
        }

        // 2. Charger la boutique et la vente
        const boutique = await manager.findOne(Boutique, { where: { id: dto.boutique } });
        if (!boutique) throw new NotFoundException('Boutique introuvable');

        const vente = await manager.findOne(Vente, {
          where: { id: dto.vente_id },
          relations: ['detail_vente', 'detail_vente.produit', 'boutique'],
        });
        if (!vente) throw new NotFoundException('Vente introuvable');

        // 3. Valider les quantités retournées vs quantités vendues
        for (const ligne of dto.details) {
          const ligneVente = vente.detail_vente.find((d) => d.produit.id === ligne.produit_id);
          if (!ligneVente) {
            throw new BadRequestException(`Produit ${ligne.produit_id} absent de la vente d'origine`);
          }

          // Quantité déjà retournée pour ce produit sur cette vente
          const dejaRetourne = await manager
            .createQueryBuilder(DetailRetourVente, 'dv')
            .innerJoin('dv.retour', 'r')
            .where('r.venteId = :venteId', { venteId: dto.vente_id })
            .andWhere('dv.produit = :produitId', { produitId: ligne.produit_id })
            .andWhere("r.statut != 'annule'")
            .select('COALESCE(SUM(dv.r_quantite_retournee), 0)', 'total')
            .getRawOne();

          const totalDejaRetourne = parseInt(dejaRetourne?.total ?? '0', 10);
          const disponible = ligneVente.quantite - totalDejaRetourne;

          if (ligne.quantite_retournee > disponible) {
            throw new BadRequestException(
              `Produit ${ligneVente.produit.nom} : quantité retournable = ${disponible}, demandée = ${ligne.quantite_retournee}`,
            );
          }
        }

        // 4. Créer le RetourVente

        const montantTotal = dto.details.reduce((sum, ligne) => {
          const ligneVente = vente.detail_vente.find((d) => d.produit.id === ligne.produit_id)!;
          return sum + ligne.quantite_retournee * ligneVente.prix_unitaire_vente;
        }, 0);

        const retour = manager.create(RetourVente, {
          reference: ReferenceGeneratorHelper.generate('RTR'),
          vente,
          boutique,
          user: tenantUser,
          motif: dto.motif ?? null,
          montant_total_rembourse: montantTotal,
          statut: 'valide',
        });
        const retourSauvegarde = await manager.save(retour);

        // 5. Créer les lignes de détail
        const lignesDetail = dto.details.map((ligne) => {
          const ligneVente = vente.detail_vente.find((d) => d.produit.id === ligne.produit_id)!;
          return manager.create(DetailRetourVente, {
            retour: retourSauvegarde,
            produit: { id: ligne.produit_id } as Produit,
            quantite_retournee: ligne.quantite_retournee,
            prix_unitaire_vente: ligneVente.prix_unitaire_vente,
            montant: ligne.quantite_retournee * ligneVente.prix_unitaire_vente,
          });
        });
        await manager.save(lignesDetail);

        // 6. Mettre à jour le stock et créer l'historique
        const produitIds = dto.details.map((d) => d.produit_id);
        const produits = await manager.findBy(Produit, { id: In(produitIds) });

        const lignesHistorique = dto.details.map((ligne) => {
          const produit = produits.find((p) => p.id === ligne.produit_id)!;
          const stock_avant = produit.stock_disponible;
          produit.stock_disponible += ligne.quantite_retournee;
          return manager.create(HistoriqueStock, {
            produit,
            quantite: ligne.quantite_retournee,
            mouvement: 'entree',
            source: 'retour',
            vente,
            stock_avant,
            stock_apres: produit.stock_disponible,
            utilisateur: tenantUser ?? undefined,
          });
        });

        await manager.save(Produit, produits);
        await manager.save(lignesHistorique);

        return retourSauvegarde;
      });
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(filters: {
    boutiqueId: number;
    reference?: string;
    date_debut?: string;
    date_fin?: string;
    montant?: number;
    page?: number;
    limit?: number;
  }) {
    const { boutiqueId, reference, date_debut, date_fin, montant, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const qb = this.ds.getRepository(RetourVente)
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.details', 'details')
      .leftJoinAndSelect('details.produit', 'produit')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.vente', 'vente')
      .leftJoinAndSelect('vente.user', 'venteUser')
      .where('r.boutiqueId = :boutiqueId', { boutiqueId });

    if (reference) {
      qb.andWhere('vente.reference ILIKE :reference', { reference: `%${reference}%` });
    }
    if (date_debut) {
      qb.andWhere('r.created_at >= :date_debut', { date_debut: new Date(date_debut) });
    }
    if (date_fin) {
      const fin = new Date(date_fin);
      fin.setHours(23, 59, 59, 999);
      qb.andWhere('r.created_at <= :date_fin', { date_fin: fin });
    }
    if (montant !== undefined) {
      qb.andWhere('vente.montant_total = :montant', { montant });
    }

    const [items, total] = await qb
      .orderBy('r.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<any> {
    const retour = await this.ds.getRepository(RetourVente)
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.details', 'details')
      .leftJoinAndSelect('details.produit', 'produit')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.boutique', 'boutique')
      .leftJoinAndSelect('r.vente', 'vente')
      .leftJoinAndSelect('vente.user', 'venteUser')
      .where('r.id = :id', { id })
      .getOne();
    if (!retour) throw new NotFoundException('Retour introuvable');
    return retour;
  }

  async findByVente(venteId: number): Promise<RetourVente[]> {
    return this.ds.getRepository(RetourVente)
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.details', 'details')
      .leftJoinAndSelect('details.produit', 'produit')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.vente', 'vente')
      .leftJoinAndSelect('vente.user', 'venteUser')
      .where('r.venteId = :venteId', { venteId })
      .orderBy('r.created_at', 'DESC')
      .getMany();
  }

  async annuler(id: number): Promise<RetourVente> {
    try {
      return await this.ds.transaction(async (manager) => {
        const retour = await manager.findOne(RetourVente, {
          where: { id },
          relations: ['details', 'details.produit'],
        });
        if (!retour) throw new NotFoundException('Retour introuvable');
        if (retour.statut === 'annule') throw new BadRequestException('Ce retour est déjà annulé');

        // Annuler = re-déduire le stock
        const produitIds = retour.details.map((d) => d.produit.id);
        const produits = await manager.findBy(Produit, { id: In(produitIds) });

        for (const detail of retour.details) {
          const produit = produits.find((p) => p.id === detail.produit.id)!;
          produit.stock_disponible -= detail.quantite_retournee;
        }
        await manager.save(Produit, produits);
        await manager.update(RetourVente, id, { statut: 'annule' });

        return { ...retour, statut: 'annule' };
      });
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
