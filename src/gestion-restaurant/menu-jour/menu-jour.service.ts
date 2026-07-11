import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MenuJour } from './entities/menu-jour.entity';
import { Recette } from 'src/gestion-restaurant/recette/entities/recette.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class MenuJourService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds()   { return this.tenantContext.getDataSource(); }
  private get repo() { return this.ds.getRepository(MenuJour); }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async findAll(boutiqueId: number) {
    return this.repo.find({
      where: { boutique: { id: boutiqueId } },
      relations: ['recettes'],
      order: { date: 'DESC' },
    });
  }

  async findByDate(boutiqueId: number, date: string) {
    return this.repo.findOne({
      where: { boutique: { id: boutiqueId }, date },
      relations: ['recettes', 'recettes.compositions', 'recettes.compositions.produit'],
    });
  }

  async findToday(boutiqueId: number) {
    return this.findByDate(boutiqueId, this.today());
  }

  async create(dto: { boutique: number; date: string; recettes: number[] }) {
    if (!dto.boutique) throw new BadRequestException('Boutique requise');
    if (!dto.date)     throw new BadRequestException('Date requise');

    const existing = await this.repo.findOne({
      where: { boutique: { id: dto.boutique }, date: dto.date },
    });
    if (existing) throw new BadRequestException(`Un menu existe déjà pour le ${dto.date}`);

    const recetteRepo = this.ds.getRepository(Recette);
    const recettes = dto.recettes?.length
      ? await recetteRepo.findByIds(dto.recettes)
      : [];

    const menu = this.repo.create({
      date:     dto.date,
      boutique: { id: dto.boutique },
      recettes,
    });
    const saved = await this.repo.save(menu);
    return this.findByDate(dto.boutique, saved.date);
  }

  async update(id: number, recetteIds: number[]) {
    const menu = await this.repo.findOne({ where: { id }, relations: ['recettes', 'boutique'] });
    if (!menu) throw new NotFoundException('Menu introuvable');

    const recetteRepo = this.ds.getRepository(Recette);
    menu.recettes = recetteIds?.length ? await recetteRepo.findByIds(recetteIds) : [];
    await this.repo.save(menu);
    return this.findByDate(menu.boutique.id, menu.date);
  }

  async remove(id: number) {
    const menu = await this.repo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('Menu introuvable');
    return this.repo.delete(id);
  }
}
