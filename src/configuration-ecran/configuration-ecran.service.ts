import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigurationEcran } from './entities/configuration-ecran.entity';
import { UpsertConfigurationEcranDto } from './dto/upsert-configuration-ecran.dto';

@Injectable()
export class ConfigurationEcranService {
  constructor(
    @InjectRepository(ConfigurationEcran)
    private readonly repo: Repository<ConfigurationEcran>,
  ) {}

  findAll(): Promise<ConfigurationEcran[]> {
    return this.repo.find({ order: { boutique_type: 'ASC', profil_code: 'ASC' } });
  }

  /**
   * Résout l'écran cible pour un couple (profilCode, boutiqueType).
   * Priorité : correspondance exacte boutique_type > wildcard (null).
   * Retourne null si aucune règle ne correspond (aucun écran configuré).
   */
  async resolve(profilCode: string, boutiqueType: string | null): Promise<string | null> {
    if (boutiqueType) {
      const exact = await this.repo.findOne({
        where: { profil_code: profilCode, boutique_type: boutiqueType },
      });
      if (exact) return exact.ecran_cible;
    }

    const wildcard = await this.repo.findOne({
      where: { profil_code: profilCode, boutique_type: IsNull() },
    });

    return wildcard?.ecran_cible ?? null;
  }

  async upsert(dto: UpsertConfigurationEcranDto): Promise<ConfigurationEcran> {
    const boutique_type = dto.boutique_type ?? null;
    const existing = await this.repo.findOne({
      where: {
        profil_code: dto.profil_code,
        boutique_type: boutique_type === null ? IsNull() : boutique_type as any,
      },
    });

    if (existing) {
      existing.ecran_cible = dto.ecran_cible;
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({ ...dto, boutique_type }),
    );
  }

  async remove(id: number): Promise<void> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Configuration introuvable');
    await this.repo.remove(config);
  }
}
