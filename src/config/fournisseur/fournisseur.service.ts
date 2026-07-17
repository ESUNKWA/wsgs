import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { Fournisseur } from './entities/fournisseur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DeepPartial } from 'typeorm';

@Injectable()
export class FournisseurService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get fournisseurRepository() {
    return this.tenantContext.getDataSource().getRepository(Fournisseur);
  }

  async create(createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    try {
      const { boutique, ...rest } = createFournisseurDto as any;
      const data: DeepPartial<Fournisseur> = boutique
        ? { ...rest, boutique: { id: Number(boutique) } }
        : { ...rest };
      return await this.fournisseurRepository.save(data);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(): Promise<Fournisseur[]> {
    return await this.fournisseurRepository.find({ order: { nom: 'ASC' } });
  }

  
  async findByBoutique(id: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.fournisseurRepository.findAndCount({
      where: { boutique: { id } },
      order: { nom: 'ASC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({ where: { id } });
    if (!fournisseur) throw new NotFoundException('Fournisseur inexistant');
    return fournisseur;
  }

  async update(id: number, updateFournisseurDto: UpdateFournisseurDto): Promise<Fournisseur> {
    try {
      const { boutique, ...rest } = updateFournisseurDto as any;
      const payload: DeepPartial<Fournisseur> = boutique
        ? { ...rest, boutique: { id: Number(boutique) } }
        : { ...rest };
      const fournisseur = await this.fournisseurRepository.preload({ id, ...payload });
      if (!fournisseur) throw new NotFoundException('Fournisseur inexistant');
      return await this.fournisseurRepository.save(fournisseur);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number) {
    return await this.fournisseurRepository.softDelete(id);
  }
}
