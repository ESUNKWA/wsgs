import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Recette } from './entities/recette.entity';
import { CompositionRecette } from './entities/composition-recette.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class RecetteService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds() { return this.tenantContext.getDataSource(); }
  private get repo() { return this.ds.getRepository(Recette); }

  async findAll(boutiqueId: number, categorie?: string) {
    if (!boutiqueId) throw new BadRequestException('Boutique requise');
    const qb = this.repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.compositions', 'comp')
      .leftJoinAndSelect('comp.produit', 'produit')
      .where('r.boutique = :b', { b: boutiqueId })
      .andWhere('r.deleted_at IS NULL')
      .orderBy('r.categorie', 'ASC')
      .addOrderBy('r.nom', 'ASC');

    if (categorie) qb.andWhere('r.categorie = :cat', { cat: categorie });
    return qb.getMany();
  }

  async findOne(id: number) {
    const r = await this.repo.findOne({
      where: { id },
      relations: ['compositions', 'compositions.produit', 'boutique'],
    });
    if (!r) throw new NotFoundException('Recette introuvable');
    return r;
  }

  async create(dto: any) {
    let createdId!: number;
    await this.ds.transaction(async (manager) => {
      const { compositions, ...recetteData } = dto;
      const recette = manager.create(Recette, {
        ...recetteData,
        boutique: { id: +dto.boutique },
      });
      const saved = await manager.save(recette);
      createdId = saved.id;

      if (compositions?.length) {
        const comps = compositions.map((c: any) =>
          manager.create(CompositionRecette, {
            produit:  { id: +c.produit },
            quantite: +c.quantite,
            recette:  saved,
          })
        );
        await manager.save(comps);
      }
    });
    return this.findOne(createdId);
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    await this.ds.transaction(async (manager) => {
      const { compositions, ...fields } = dto;
      if (fields.boutique) fields.boutique = { id: +fields.boutique };
      await manager.update(Recette, id, fields);

      if (compositions !== undefined) {
        await manager.delete(CompositionRecette, { recette: { id } });
        if (compositions.length) {
          const comps = compositions.map((c: any) =>
            manager.create(CompositionRecette, {
              produit:  { id: +c.produit },
              quantite: +c.quantite,
              recette:  { id },
            })
          );
          await manager.save(comps);
        }
      }
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.repo.softDelete(id);
  }

  async importDepuisStock(
    boutiqueId: number,
    items: { produit_id: number; nom: string; prix_vente: number; categorie: string }[],
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const item of items) {
      // Ne pas créer si une recette du même nom existe déjà pour cette boutique
      const existing = await this.repo.findOne({
        where: { nom: item.nom, boutique: { id: boutiqueId } },
      });
      if (existing) { skipped++; continue; }

      await this.ds.transaction(async (manager) => {
        const recette = manager.create(Recette, {
          nom:        item.nom,
          categorie:  item.categorie || 'Boissons',
          prix_vente: +item.prix_vente,
          actif:      true,
          boutique:   { id: boutiqueId },
        });
        const saved = await manager.save(recette);

        const comp = manager.create(CompositionRecette, {
          produit:  { id: +item.produit_id },
          quantite: 1,
          recette:  saved,
        });
        await manager.save(comp);
      });
      created++;
    }

    return { created, skipped };
  }
}
