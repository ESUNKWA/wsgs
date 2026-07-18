import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { CreateBonSortieDto } from './dto/create-bon-sortie.dto';
import { BonSortie } from './entities/bon-sortie.entity';
import { LigneBonSortie } from './entities/ligne-bon-sortie.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { HistoriqueStock } from '../historique-stock/entities/historique-stock.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class BonSortieService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds() { return this.tenantContext.getDataSource(); }
  private get repo() { return this.ds.getRepository(BonSortie); }

  async create(dto: CreateBonSortieDto): Promise<BonSortie> {
    if (!dto.lignes?.length) throw new BadRequestException('Ajoutez au moins une fourniture');

    try {
      return await this.ds.transaction(async (manager) => {
        // Résoudre l'utilisateur tenant si téléphone fourni
        let utilisateur: Utilisateur | null = null;
        if (dto.telephone) {
          utilisateur = await manager.findOne(Utilisateur, { where: { telephone: dto.telephone } });
        }

        // Charger les fournitures concernées
        const fournitureIds = dto.lignes.map((l) => l.fourniture);
        const fournitures = await manager.findBy(Produit, { id: In(fournitureIds) });

        // Vérifier le stock disponible pour chaque ligne
        for (const ligne of dto.lignes) {
          const produit = fournitures.find((p) => p.id === ligne.fourniture);
          if (!produit) throw new BadRequestException(`Fourniture #${ligne.fourniture} introuvable`);
          if ((produit.stock_disponible ?? 0) < ligne.quantite) {
            throw new BadRequestException(
              `Stock insuffisant pour "${produit.nom}" : disponible ${produit.stock_disponible ?? 0}, demandé ${ligne.quantite}`,
            );
          }
        }

        // Créer le bon de sortie
        const bon = manager.create(BonSortie, {
          reference: ReferenceGeneratorHelper.generate('BSO'),
          motif: dto.motif,
          boutiqueSource: { id: dto.boutique } as any,
          departement: { id: dto.departement } as any,
          utilisateur: utilisateur ?? undefined,
        } as any);
        const bonSauvegarde = await manager.save(BonSortie, bon);

        // Créer les lignes
        const lignes = dto.lignes.map((l) =>
          manager.create(LigneBonSortie, {
            quantite: l.quantite,
            fourniture: { id: l.fourniture } as any,
            bonSortie: bonSauvegarde,
          } as any),
        );
        await manager.save(LigneBonSortie, lignes);

        // Mettre à jour le stock et créer l'historique
        const historiqueEntries: HistoriqueStock[] = [];
        for (const produit of fournitures) {
          const ligne = dto.lignes.find((l) => l.fourniture === produit.id)!;
          const stock_avant = produit.stock_disponible ?? 0;
          produit.stock_disponible = stock_avant - ligne.quantite;

          historiqueEntries.push(
            manager.create(HistoriqueStock, {
              produit: { id: produit.id } as any,
              quantite: ligne.quantite,
              mouvement: 'sortie',
              source: 'sortie_interne',
              stock_avant,
              stock_apres: produit.stock_disponible,
              utilisateur: utilisateur ?? undefined,
            } as any),
          );
        }
        await manager.save(Produit, fournitures);
        await manager.save(HistoriqueStock, historiqueEntries);

        return bonSauvegarde;
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByBoutique(boutiqueId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo
      .createQueryBuilder('b')
      .where('b.boutiqueSourceId = :boutiqueId', { boutiqueId })
      .andWhere('b.deleted_at IS NULL')
      .orderBy('b.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<BonSortie> {
    const bon = await this.repo.findOne({ where: { id }, relations: ['lignes', 'lignes.fourniture'] });
    if (!bon) throw new NotFoundException('Bon de sortie introuvable');
    return bon;
  }

  async remove(id: number) {
    return this.repo.softDelete(id);
  }
}
