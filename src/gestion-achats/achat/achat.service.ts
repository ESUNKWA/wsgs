import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { In } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { HistoriqueStock } from '../historique-stock/entities/historique-stock.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class AchatService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get achatRepository() { return this.dataSource.getRepository(Achat); }

  async create(createAchatDto: CreateAchatDto): Promise<Achat> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const telephone = String((createAchatDto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        createAchatDto.reference = ReferenceGeneratorHelper.generate('ACH');
        const { detail_achat, ...achatData } = createAchatDto as any;
        const achat = manager.create(Achat, {
          ...achatData,
          user: tenantUser ?? undefined,
        } as any);
        const achatSauvegarde = await manager.save(achat);

        const lignes = createAchatDto.detail_achat.map((ligne: any) =>
          manager.create(DetailAchat, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire,
            achat,
          })
        );
        await manager.save(lignes);

        const produitsIds = createAchatDto.detail_achat.map((l: any) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds) });

        const lignesHistorik = createAchatDto.detail_achat.map((ligne: any) => {
          const produit = produits.find((p) => p.id === ligne.produit);
          const stock_avant = produit?.stock_disponible ?? 0;
          return manager.create(HistoriqueStock, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            mouvement: 'entree',
            source: 'achat',
            achat,
            stock_avant,
            stock_apres: stock_avant + ligne.quantite,
            utilisateur: tenantUser ?? undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = createAchatDto.detail_achat.find((l: any) => l.produit === produit.id);
          if (ligne) produit.stock_disponible += ligne.quantite;
        }
        await manager.save(Produit, produits);

        return achatSauvegarde;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number; date_debut?: string; date_fin?: string }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const qb = this.achatRepository.createQueryBuilder('a')
      .where('a.boutiqueId = :boutiqueId', { boutiqueId: query.boutique })
      .andWhere('a.deleted_at IS NULL');

    if (query.date_debut) {
      qb.andWhere('a.created_at >= :debut', { debut: new Date(query.date_debut) });
    }
    if (query.date_fin) {
      const fin = new Date(query.date_fin);
      fin.setHours(23, 59, 59, 999);
      qb.andWhere('a.created_at <= :fin', { fin });
    }

    const [items, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .skip(skip).take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Achat> {
    const achat = await this.achatRepository.findOne({
      where: { id },
      relations: ['detail_achat'],
    });
    if (!achat) throw new NotFoundException('Achat inexistant');
    return achat;
  }

  async update(id: number, updateAchatDto: any): Promise<Achat> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const telephone = String(updateAchatDto.user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        const achat = await manager.preload(Achat, { id, ...updateAchatDto });
        if (!achat) throw new Error('Achat introuvable');

        const oldLines = await manager.find(DetailAchat, {
          where: { achat: { id } },
          relations: ['produit'],
        });
        if (oldLines.length > 0) {
          const oldProduitIds = [...new Set(oldLines.map((l) => l.produit.id))];
          const oldProduits = await manager.findBy(Produit, { id: In(oldProduitIds) });
          for (const p of oldProduits) {
            const l = oldLines.find((ol) => ol.produit.id === p.id);
            if (l) p.stock_disponible -= l.quantite;
          }
          await manager.save(Produit, oldProduits);
        }

        await manager.delete(DetailAchat, { achat: achat.id });

        const lignes: DetailAchat[] = updateAchatDto.detail_achat.map((ligne: any) => {
          const l = new DetailAchat();
          l.produit = ligne.produit;
          l.quantite = ligne.quantite;
          l.prix_unitaire = ligne.prix_unitaire;
          l.achat = achat;
          return l;
        });

        await manager.save(Achat, achat);
        await manager.save(DetailAchat, lignes);
        await manager.delete(HistoriqueStock, { achat: achat.id });

        const produitsIds = updateAchatDto.detail_achat.map((l: any) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds) });

        const lignesHistorik = updateAchatDto.detail_achat.map((ligne: any) => {
          const produit = produits.find((p) => p.id === ligne.produit);
          const stock_avant = produit?.stock_disponible ?? 0;
          return manager.create(HistoriqueStock, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            mouvement: 'entree',
            source: 'achat',
            achat,
            stock_avant,
            stock_apres: stock_avant + ligne.quantite,
            utilisateur: tenantUser ?? undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = updateAchatDto.detail_achat.find((l: any) => l.produit === produit.id);
          if (ligne) produit.stock_disponible += ligne.quantite;
        }
        await manager.save(Produit, produits);

        return achat;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} achat`;
  }
}
