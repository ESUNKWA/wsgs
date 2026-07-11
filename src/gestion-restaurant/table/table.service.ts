import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TableRestaurant, StatutTable } from './entities/table.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class TableRestaurantService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get repo() {
    return this.tenantContext.getDataSource().getRepository(TableRestaurant);
  }

  async findAll(boutiqueId: number) {
    if (!boutiqueId) throw new BadRequestException('Boutique requise');
    return this.repo.find({
      where: { boutique: { id: boutiqueId } },
      order: { numero: 'ASC' },
    });
  }

  async findOne(id: number) {
    const t = await this.repo.findOne({ where: { id }, relations: ['boutique'] });
    if (!t) throw new NotFoundException('Table introuvable');
    return t;
  }

  async create(dto: any) {
    const table = this.repo.create({
      ...dto,
      boutique: { id: +dto.boutique },
    });
    return this.repo.save(table);
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    await this.repo.update(id, {
      numero:   dto.numero   ?? undefined,
      nom:      dto.nom      ?? undefined,
      capacite: dto.capacite ?? undefined,
    });
    return this.findOne(id);
  }

  async changerStatut(id: number, statut: StatutTable) {
    await this.findOne(id);
    await this.repo.update(id, { statut });
    return this.findOne(id);
  }

  async acquitterAppel(id: number) {
    await this.findOne(id);
    await this.repo.update(id, { appel_serveur: false } as any);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.repo.softDelete(id);
  }
}
