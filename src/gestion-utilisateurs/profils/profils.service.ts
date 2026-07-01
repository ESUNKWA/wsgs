import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProfilDto } from './dto/create-profil.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Profil } from './entities/profil.entity';
import { Repository } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class ProfilsService {

  constructor(
    @InjectRepository(Profil) private readonly profilRepository: Repository<Profil>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async syncProfilToTenant(profil: Profil): Promise<void> {
    if (!this.tenantContext.hasContext()) return;
    const tenantRepo = this.tenantContext.getDataSource().getRepository(Profil);
    await tenantRepo.upsert([profil], ['code']);
  }

  async create(createProfilDto: CreateProfilDto): Promise<Profil> {
    try {
      const saved = await this.profilRepository.save(createProfilDto);
      await this.syncProfilToTenant(saved);
      return saved;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(): Promise<Profil[]> {
    return await this.profilRepository.find({ order: { nom: 'ASC' } });
  }

  async findOne(id: number): Promise<Profil> {
    const profil = await this.profilRepository.findOne({ where: { id } });
    if (!profil) throw new NotFoundException('Profil inexistant');
    return profil;
  }

  async findOneByCode(code: string): Promise<Profil> {
    const profil = await this.profilRepository.findOne({ where: { code } });
    if (!profil) throw new NotFoundException('Profil inexistant');
    return profil;
  }

  async update(id: number, updateProfilDto: UpdateProfilDto) {
    try {
      const profil = await this.profilRepository.preload({ id, ...updateProfilDto });
      if (!profil) throw new NotFoundException('Profil inexistant');
      const saved = await this.profilRepository.save(profil);
      await this.syncProfilToTenant(saved);
      return saved;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    if (this.tenantContext.hasContext()) {
      const masterProfil = await this.profilRepository.findOne({ where: { id } });
      if (masterProfil?.code) {
        const tenantProfil = await this.tenantContext.getDataSource().getRepository(Profil).findOne({ where: { code: masterProfil.code } });
        if (tenantProfil) {
          await this.tenantContext.getDataSource().getRepository(Profil).softDelete(tenantProfil.id);
        }
      }
    }
    return this.profilRepository.softDelete(id);
  }
}
