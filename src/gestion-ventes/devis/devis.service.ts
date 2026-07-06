import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Devis, StatutDevis } from './entities/devis.entity';
import { DetailDevis } from './entities/detail-devis.entity';
import { CreateDevisDto } from './dto/create-devis.dto';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Client } from '../client/entities/client.entity';
import { VenteService } from '../vente/vente.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class DevisService {

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly venteService: VenteService,
  ) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get devisRepository() { return this.dataSource.getRepository(Devis); }

  async create(createDevisDto: CreateDevisDto): Promise<Devis> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const telephone = String((createDevisDto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        let client: Client | null = null;
        if (createDevisDto.clientdata?.telephone) {
          const existing = await manager.findOne(Client, {
            where: { telephone: createDevisDto.clientdata.telephone },
          });
          client = existing ?? await manager.save(manager.create(Client, createDevisDto.clientdata));
        } else if (createDevisDto.clientdata) {
          client = await manager.save(manager.create(Client, createDevisDto.clientdata));
        }

        createDevisDto.reference = ReferenceGeneratorHelper.generate('DEV');
        createDevisDto.statut = 'brouillon';
        if (client) createDevisDto.client = client;

        const devis = manager.create(Devis, {
          ...createDevisDto,
          user: tenantUser ?? undefined,
        } as any);
        const devisSauvegarde = await manager.save(devis);

        const lignes = createDevisDto.detail_devis.map((ligne: any) =>
          manager.create(DetailDevis, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire,
            devis: devisSauvegarde,
          })
        );
        await manager.save(lignes);

        return devisSauvegarde;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number; date_debut?: string; date_fin?: string }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const skip  = (page - 1) * limit;

    const qb = this.devisRepository.createQueryBuilder('d')
      .where('d.boutiqueId = :boutiqueId', { boutiqueId: query.boutique })
      .andWhere('d.deleted_at IS NULL');

    if (query.date_debut) {
      qb.andWhere('d.created_at >= :debut', { debut: new Date(query.date_debut) });
    }
    if (query.date_fin) {
      const fin = new Date(query.date_fin);
      fin.setHours(23, 59, 59, 999);
      qb.andWhere('d.created_at <= :fin', { fin });
    }

    const [items, total] = await qb
      .orderBy('d.created_at', 'DESC')
      .skip(skip).take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Devis> {
    const devis = await this.devisRepository.findOne({
      where: { id },
      relations: ['detail_devis', 'client', 'boutique', 'user'],
    });
    if (!devis) throw new NotFoundException('Devis inexistant');
    return devis;
  }

  async updateStatut(id: number, statut: StatutDevis): Promise<Devis> {
    const devis = await this.findOne(id);
    devis.statut = statut;
    return this.devisRepository.save(devis);
  }

  async update(id: number, updateDevisDto: any): Promise<Devis> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const devis = await manager.preload(Devis, { id, ...updateDevisDto });
        if (!devis) throw new Error('Devis introuvable');

        if (updateDevisDto.detail_devis) {
          await manager.delete(DetailDevis, { devis: { id } });
          const lignes = updateDevisDto.detail_devis.map((ligne: any) =>
            manager.create(DetailDevis, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              prix_unitaire: ligne.prix_unitaire,
              devis,
            })
          );
          await manager.save(lignes);
        }

        return manager.save(devis);
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async convertToVente(id: number): Promise<any> {
    const devis = await this.findOne(id);

    if (devis.statut === 'refuse' || devis.statut === 'expire') {
      throw new BadRequestException(`Impossible de convertir un devis avec le statut "${devis.statut}"`);
    }

    const venteDto: any = {
      boutique: devis.boutique,
      client: devis.client,
      clientdata: devis.client
        ? { nom: devis.client.nom, telephone: devis.client.telephone, email: devis.client.email }
        : null,
      montant_total: devis.montant_total,
      montant_total_apres_remise: devis.montant_total_apres_remise,
      remise: devis.remise,
      statut: 'validé',
      detail_vente: devis.detail_devis.map((d) => ({
        produit: d.produit.id,
        quantite: d.quantite,
        prix_unitaire_vente: d.prix_unitaire,
      })),
      user: (devis as any).user?.telephone ?? null,
    };

    const result = await this.venteService.create(venteDto);

    // Marquer le devis comme accepté
    await this.devisRepository.update(id, { statut: 'accepte' });

    return result;
  }

  remove(id: number) {
    return this.devisRepository.softDelete(id);
  }
}
