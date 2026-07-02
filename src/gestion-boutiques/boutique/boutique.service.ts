import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { Boutique } from './entities/boutique.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { TenantService } from 'src/tenant/tenant.service';
import { DataSource } from 'typeorm';
import { buildTenantFilePath } from 'src/common/helpers/tenant-file.helper';

@Injectable()
export class BoutiqueService {

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantService: TenantService,
  ) {}

  private async resolveDs(structureId?: number): Promise<DataSource> {
    if (this.tenantContext.hasContext()) return this.tenantContext.getDataSource();
    if (structureId) return this.tenantService.getDataSource(structureId);
    throw new InternalServerErrorException('Structure requise pour accéder aux boutiques.');
  }

  async create(createBoutiqueDto: CreateBoutiqueDto, file?: Express.Multer.File): Promise<Boutique> {
    try {
      const { structure, ...rest } = createBoutiqueDto as any;
      const dtoStructureId: number | undefined =
        typeof structure === 'object' ? structure?.id : +structure || undefined;
      const structureId =
        dtoStructureId ?? (this.tenantContext.hasContext() ? (this.tenantContext.getStructureId() ?? undefined) : undefined);
      const ds = await this.resolveDs(structureId);
      const repo = ds.getRepository(Boutique);
      const data = repo.create({
        ...rest,
        structure_id: structureId,
        logo: file ? buildTenantFilePath(structureId ?? null, 'logos', file.filename) : null,
      });
      return await repo.save(data) as any;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(structureId?: number): Promise<Boutique[]> {
    const ds = await this.resolveDs(structureId);
    const boutiques = await ds.getRepository(Boutique).find({ order: { nom: 'ASC' } });
    return boutiques.map((b) => ({
      ...b,
      imageUrl: b.logo ? `${String(process.env.BASE_URL)}/${b.logo}` : null,
    }));
  }

  async findByStructure(idStructure: string): Promise<Boutique[]> {
    const id = parseInt(idStructure, 10);
    if (isNaN(id)) throw new BadRequestException('Identifiant de structure invalide');
    const ds = await this.resolveDs(id);
    const boutiques = await ds.getRepository(Boutique).find({
      where: { structure_id: id },
      order: { nom: 'ASC' },
    });
    return boutiques.map((b) => ({
      ...b,
      imageUrl: b.logo ? `${String(process.env.BASE_URL)}/${b.logo}` : null,
    }));
  }

  async findOne(id: number, structureId?: number): Promise<Boutique> {
    const ds = await this.resolveDs(structureId);
    const data = await ds.getRepository(Boutique).findOne({ where: { id } });
    if (!data) throw new NotFoundException('Boutique inexistante');
    return data;
  }

  async update(id: number, updateBoutiqueDto: UpdateBoutiqueDto, file?: Express.Multer.File, structureId?: number) {
    try {
      const { structure, ...rest } = updateBoutiqueDto as any;
      // structure peut venir du param explicit ou du body DTO
      const sid: number | undefined =
        structureId ??
        (structure != null ? +(typeof structure === 'object' ? structure.id : structure) || undefined : undefined) ??
        (this.tenantContext.hasContext() ? (this.tenantContext.getStructureId() ?? undefined) : undefined);

      const ds = await this.resolveDs(sid);
      const repo = ds.getRepository(Boutique);
      const boutique = await repo.preload({ id, ...rest });
      if (!boutique) throw new NotFoundException('Boutique inexistante');
      if (file) boutique.logo = buildTenantFilePath(sid ?? null, 'logos', file.filename);
      return await repo.save(boutique);
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} boutique`;
  }
}
