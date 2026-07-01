import { BadRequestException, Injectable } from '@nestjs/common';
import { HistoriqueStock } from './entities/historique-stock.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class HistoriqueStockService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get historiqueRepository() {
    return this.tenantContext.getDataSource().getRepository(HistoriqueStock);
  }

  async findAll(query: { boutique?: number; produit?: number; page?: number; limit?: number }) {
    if (!query.boutique && !query.produit) {
      throw new BadRequestException('Veuillez préciser la boutique ou le produit.');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 30;
    const skip = (page - 1) * limit;

    const qb = this.historiqueRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.produit', 'produit')
      .leftJoinAndSelect('h.achat', 'achat')
      .leftJoinAndSelect('h.vente', 'vente')
      .leftJoinAndSelect('h.utilisateur', 'utilisateur')
      .orderBy('h.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.boutique) {
      qb.leftJoin('produit.boutique', 'boutique')
        .where('boutique.id = :boutiqueId', { boutiqueId: query.boutique });
    }

    if (query.produit) {
      qb.andWhere('produit.id = :produitId', { produitId: query.produit });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByProduit(produitId: number) {
    return this.historiqueRepository.find({
      where: { produit: { id: produitId } },
      order: { created_at: 'DESC' },
    });
  }
}
