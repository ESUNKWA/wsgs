import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { Fournisseur } from './entities/fournisseur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class FournisseurService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get fournisseurRepository() {
    return this.tenantContext.getDataSource().getRepository(Fournisseur);
  }

  // Un fournisseur n'est plus rattaché à une boutique précise : la base tenant
  // appartient déjà à une seule structure, donc il est visible pour toute la structure.
  async create(createFournisseurDto: CreateFournisseurDto): Promise<Fournisseur> {
    try {
      return await this.fournisseurRepository.save(createFournisseurDto as any);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(): Promise<Fournisseur[]> {
    return await this.fournisseurRepository.find({ order: { nom: 'ASC' } });
  }

  async findOne(id: number): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({ where: { id } });
    if (!fournisseur) throw new NotFoundException('Fournisseur inexistant');
    return fournisseur;
  }

  async update(id: number, updateFournisseurDto: UpdateFournisseurDto): Promise<Fournisseur> {
    try {
      const fournisseur = await this.fournisseurRepository.preload({ id, ...(updateFournisseurDto as any) });
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
