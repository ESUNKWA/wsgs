import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ALL_MODULES, ModuleCode, ModuleStructure } from './entities/module-structure.entity';

@Injectable()
export class ModuleStructureService {
  constructor(
    @InjectRepository(ModuleStructure)
    private readonly repo: Repository<ModuleStructure>,
  ) {}

  async findByStructure(structureId: number): Promise<ModuleStructure[]> {
    return this.repo.find({ where: { structureId } });
  }

  /** Liste des codes de modules actifs pour une structure */
  async getActiveModules(structureId: number): Promise<ModuleCode[]> {
    const rows = await this.repo.find({ where: { structureId, est_actif: true } });
    return rows.map((r) => r.module);
  }

  /** Upsert : crée ou met à jour chaque module pour la structure */
  async updateModules(
    structureId: number,
    updates: { module: ModuleCode; est_actif: boolean }[],
  ): Promise<ModuleStructure[]> {
    for (const u of updates) {
      const existing = await this.repo.findOne({
        where: { structureId, module: u.module },
      });
      if (existing) {
        await this.repo.update(existing.id, { est_actif: u.est_actif });
      } else {
        await this.repo.save(
          this.repo.create({ structureId, module: u.module, est_actif: u.est_actif }),
        );
      }
    }
    return this.findByStructure(structureId);
  }

  /** Initialise les lignes manquantes pour une structure (tous modules à false) */
  async initForStructure(structureId: number): Promise<void> {
    for (const code of ALL_MODULES) {
      const exists = await this.repo.findOne({ where: { structureId, module: code } });
      if (!exists) {
        await this.repo.save(this.repo.create({ structureId, module: code, est_actif: false }));
      }
    }
  }
}
