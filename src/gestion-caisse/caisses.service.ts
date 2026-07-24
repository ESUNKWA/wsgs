import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Caisse } from './entities/caisse.entity';
import { SessionCaisse } from './entities/session-caisse.entity';
import { CreateCaisseDto, UpdateCaisseDto } from './dto/create-caisse.dto';

@Injectable()
export class CaissesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get ds()   { return this.tenantContext.getDataSource(); }
  private get repo() { return this.ds.getRepository(Caisse); }

  async findAll(boutiqueId: number): Promise<Caisse[]> {
    return this.repo.find({
      where: { boutique: { id: boutiqueId } },
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Caisse> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Caisse introuvable');
    return c;
  }

  async create(dto: CreateCaisseDto): Promise<Caisse> {
    const existing = await this.repo.findOne({
      where: { boutique: { id: dto.boutique }, code: dto.code },
    });
    if (existing) throw new BadRequestException(`Le code "${dto.code}" est déjà utilisé dans cette boutique`);

    const caisse = this.repo.create({
      nom:         dto.nom,
      code:        dto.code.toUpperCase(),
      description: dto.description ?? null,
      emplacement: dto.emplacement ?? null,
      statut:      'ACTIVE',
      boutique:    { id: dto.boutique } as any,
    });
    return this.repo.save(caisse);
  }

  async update(id: number, dto: UpdateCaisseDto): Promise<Caisse> {
    const caisse = await this.findOne(id);
    if (dto.code && dto.code !== caisse.code) {
      const collision = await this.repo.findOne({
        where: { boutique: { id: (caisse.boutique as any)?.id ?? (caisse as any).boutiqueId }, code: dto.code.toUpperCase() },
      });
      if (collision) throw new BadRequestException(`Le code "${dto.code}" est déjà utilisé`);
    }
    Object.assign(caisse, {
      ...(dto.nom         !== undefined && { nom:         dto.nom }),
      ...(dto.code        !== undefined && { code:        dto.code.toUpperCase() }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.emplacement !== undefined && { emplacement: dto.emplacement }),
      ...(dto.statut      !== undefined && { statut:      dto.statut }),
    });
    return this.repo.save(caisse);
  }

  async toggleStatut(id: number): Promise<Caisse> {
    const caisse = await this.findOne(id);
    caisse.statut = caisse.statut === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.repo.save(caisse);
  }

  async remove(id: number): Promise<void> {
    const caisse = await this.findOne(id);
    const openSession = await this.ds.getRepository(SessionCaisse).findOne({
      where: { caisse: { id }, statut: 'ouverte' },
    });
    if (openSession) {
      throw new BadRequestException('Impossible de supprimer une caisse avec une session en cours');
    }
    await this.repo.remove(caisse);
  }

  /** Auto-crée "Caisse principale" par boutique et rattache les sessions orphelines */
  async migrer(boutiqueId: number): Promise<{ message: string; migrated: number; caisse?: Caisse }> {
    const sessionRepo = this.ds.getRepository(SessionCaisse);

    const orphanCount = await sessionRepo.count({
      where: { boutique: { id: boutiqueId }, caisse: IsNull() },
    });

    if (orphanCount === 0) {
      return { message: 'Aucune session orpheline à migrer', migrated: 0 };
    }

    let caissePrincipale = await this.repo.findOne({
      where: { boutique: { id: boutiqueId }, code: 'MAIN' },
    });

    if (!caissePrincipale) {
      caissePrincipale = await this.repo.save(
        this.repo.create({
          nom:      'Caisse principale',
          code:     'MAIN',
          statut:   'ACTIVE',
          boutique: { id: boutiqueId } as any,
        }),
      );
    }

    await this.ds.query(
      `UPDATE t_sessions_caisse SET "caisseId" = $1 WHERE "boutiqueId" = $2 AND "caisseId" IS NULL`,
      [caissePrincipale.id, boutiqueId],
    );

    return {
      message:  `${orphanCount} session(s) migrée(s) vers "${caissePrincipale.nom}"`,
      migrated: orphanCount,
      caisse:   caissePrincipale,
    };
  }
}
