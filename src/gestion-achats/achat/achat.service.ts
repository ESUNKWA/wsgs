import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { DataSource, In, Repository } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailAchat } from '../detail-achat/entities/detail-achat.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { HistoriqueStock } from '../historique-stock/entities/historique-stock.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';

@Injectable()
export class AchatService {

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Achat) private achatRepository: Repository<Achat>,
  ) {}

  async create(createAchatDto: CreateAchatDto): Promise<Achat> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        createAchatDto.reference = ReferenceGeneratorHelper.generate('ACH');
        const achat = manager.create(Achat, createAchatDto);
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

        // Charger les produits avant de modifier le stock pour capturer stock_avant
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
            utilisateur: createAchatDto.user ? { id: (createAchatDto.user as any)?.id ?? createAchatDto.user } : undefined,
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

  async findAll(query: { boutique: number; page?: number; limit?: number }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.achatRepository.findAndCount({
      where: { boutique: { id: query.boutique } },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

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

        const achat = await manager.preload(Achat, { id, ...updateAchatDto });
        if (!achat) throw new Error('Achat introuvable');

        // Charger les anciennes lignes pour corriger le stock avant suppression
        const oldLines = await manager.find(DetailAchat, {
          where: { achat: { id } },
          relations: ['produit'],
        });
        if (oldLines.length > 0) {
          const oldProduitIds = [...new Set(oldLines.map((l) => l.produit.id))];
          const oldProduits = await manager.findBy(Produit, { id: In(oldProduitIds) });
          for (const p of oldProduits) {
            const l = oldLines.find((ol) => ol.produit.id === p.id);
            if (l) p.stock_disponible -= l.quantite; // annuler l'entrée de stock
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

        const produitsIdsUpd = updateAchatDto.detail_achat.map((l: any) => l.produit);
        const produitsUpd = await manager.findBy(Produit, { id: In(produitsIdsUpd) });

        const lignesHistorik = updateAchatDto.detail_achat.map((ligne: any) => {
          const produit = produitsUpd.find((p) => p.id === ligne.produit);
          const stock_avant = produit?.stock_disponible ?? 0;
          return manager.create(HistoriqueStock, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            mouvement: 'entree',
            source: 'achat',
            achat,
            stock_avant,
            stock_apres: stock_avant + ligne.quantite,
            utilisateur: updateAchatDto.user ? { id: (updateAchatDto.user as any)?.id ?? updateAchatDto.user } : undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produitsUpd) {
          const ligne = updateAchatDto.detail_achat.find((l: any) => l.produit === produit.id);
          if (ligne) produit.stock_disponible += ligne.quantite;
        }
        await manager.save(Produit, produitsUpd);

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
