import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { Structure } from './entities/structure.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from 'src/tenant/tenant.service';
import { Boutique } from '../boutique/entities/boutique.entity';
import { buildTenantFilePath, buildTenantDir } from 'src/common/helpers/tenant-file.helper';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StructureService {

  constructor(
    @InjectRepository(Structure)
    private structureRepository: Repository<Structure>,
    private readonly tenantService: TenantService,
  ) {}

  async create(createStructureDto: CreateStructureDto, file?: Express.Multer.File): Promise<Structure> {
    try {
      // Save first to get the auto-generated ID
      const structure = await this.structureRepository.save(
        this.structureRepository.create({ ...createStructureDto, logo: null }),
      );

      if (file) {
        // Move the file from the temp location (public/logos/) into the tenant folder
        const tenantDir = buildTenantDir(structure.id, 'logos');
        fs.mkdirSync(tenantDir, { recursive: true });
        const dest = path.join(tenantDir, file.filename);
        fs.renameSync(file.path, dest);
        structure.logo = buildTenantFilePath(structure.id, 'logos', file.filename);
        await this.structureRepository.save(structure);
      }

      return structure;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(profil?: string, structureId?: number): Promise<any[]> {
    const where = profil === 'super_admin' ? {} : { id: structureId };

    const structures = await this.structureRepository.find({
      where,
      order: { nom: 'ASC' },
      relations: ['responsable'],
    });

    return Promise.all(
      structures.map(async (s) => {
        let boutiques: Boutique[] = [];
        try {
          const ds = await this.tenantService.getDataSource(s.id);
          boutiques = await ds.getRepository(Boutique).find({ order: { nom: 'ASC' } });
        } catch {
          // tenant non provisionné → boutiques vide
        }
        return {
          ...s,
          imageUrl: s.logo ? `${String(process.env.BASE_URL)}/${s.logo}` : null,
          boutiques,
        };
      }),
    );
  }

  async findOne(id: number): Promise<Structure> {
    const data = await this.structureRepository.findOne({ where: { id } });
    if (!data) throw new NotFoundException('Structure inexistante');
    return data;
  }

  async update(id: number, updateStructureDto: UpdateStructureDto, file?: Express.Multer.File) {
    try {
      delete (updateStructureDto as any).responsable;
      const structure = await this.structureRepository.preload({ id, ...updateStructureDto });
      if (!structure) throw new NotFoundException('Structure inexistante');

      if (file) {
        // :id is known → file was already saved to public/tenants/{id}/logos/ by multer
        structure.logo = buildTenantFilePath(id, 'logos', file.filename);
      }

      return await this.structureRepository.save(structure);
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} structure`;
  }
}
