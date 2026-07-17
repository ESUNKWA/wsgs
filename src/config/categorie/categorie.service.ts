import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { Categorie } from './entities/categorie.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import * as XLSX from 'xlsx';

@Injectable()
export class CategorieService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get categorieRepository() {
    return this.tenantContext.getDataSource().getRepository(Categorie);
  }

  async create(createCategorieDto: CreateCategorieDto): Promise<Categorie> {
    try {
      return await this.categorieRepository.save(createCategorieDto);
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.detail?.includes('nom')) {
          throw new ConflictException('Ce nom est déjà utilisé');
        }
        throw new ConflictException('Cette donnée existe déjà en base');
      }
      throw new InternalServerErrorException('Erreur interne du serveur');
    }
  }

  async findAll(): Promise<Categorie[]> {
    return await this.categorieRepository.find({ order: { nom: 'ASC' } });
  }

  async findByBoutik(id: number): Promise<Categorie[]> {
    return await this.categorieRepository.find({ where: { boutique: { id } }, order: { nom: 'ASC' } });
  }

  async findOne(id: number): Promise<Partial<Categorie>> {
    const categorie = await this.categorieRepository.findOne({ where: { id } });
    if (!categorie) throw new NotFoundException('Catégorie inexistante');
    return categorie;
  }

  async update(id: number, updateCategorieDto: UpdateCategorieDto): Promise<Partial<Categorie>> {
    const categorie = await this.categorieRepository.preload({ id, ...updateCategorieDto });
    if (!categorie) throw new NotFoundException('Catégorie inexistante');
    return await this.categorieRepository.save(categorie);
  }

  async remove(id: number) {
    return await this.categorieRepository.softDelete(id);
  }

  async copierVersBoutiques(
    sourceBoutiqueId: number,
    targetBoutiqueIds: number[],
  ): Promise<{ created: number; alreadyExists: number }> {
    if (!sourceBoutiqueId) throw new BadRequestException('Boutique source requise');
    if (!targetBoutiqueIds?.length) throw new BadRequestException('Sélectionnez au moins une boutique cible');

    const categories = await this.categorieRepository.find({
      where: { boutique: { id: sourceBoutiqueId } },
      order: { nom: 'ASC' },
    });

    let created = 0;
    let alreadyExists = 0;

    for (const targetId of targetBoutiqueIds) {
      for (const cat of categories) {
        try {
          await this.categorieRepository.save({
            nom: cat.nom,
            description: cat.description,
            boutique: { id: targetId },
          });
          created++;
        } catch (error: any) {
          if (error.code === '23505') {
            alreadyExists++;
          } else {
            throw new InternalServerErrorException(error.message);
          }
        }
      }
    }

    return { created, alreadyExists };
  }

  async importFromFile(
    file: Express.Multer.File,
    boutiqueId: number,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    if (!boutiqueId || isNaN(boutiqueId)) {
      throw new BadRequestException('Veuillez préciser la boutique');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) throw new BadRequestException('Le fichier est vide');

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nom = String(row['nom'] ?? row['Nom'] ?? '').trim();

      if (!nom) {
        errors.push(`Ligne ${i + 2} : le champ "nom" est obligatoire`);
        skipped++;
        continue;
      }

      try {
        const entity = this.categorieRepository.create({ nom });
        (entity as any).description = String(row['description'] ?? row['Description'] ?? '').trim() || null;
        (entity as any).boutique = { id: boutiqueId };
        await this.categorieRepository.save(entity);
        created++;
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
        } else {
          errors.push(`Ligne ${i + 2} (${nom}) : ${error.message}`);
          skipped++;
        }
      }
    }

    return { created, skipped, errors };
  }
}
