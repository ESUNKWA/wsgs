import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandeFournisseur, StatutCommandeFournisseur } from './entities/commande-fournisseur.entity';
import { DetailCommandeFournisseur } from './entities/detail-commande-fournisseur.entity';
import { CreateCommandeFournisseurDto } from './dto/create-commande-fournisseur.dto';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { AchatService } from '../achat/achat.service';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class CommandeFournisseurService {

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly achatService: AchatService,
  ) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get commandeRepository() { return this.dataSource.getRepository(CommandeFournisseur); }

  async create(createDto: CreateCommandeFournisseurDto): Promise<CommandeFournisseur> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const telephone = String((createDto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        createDto.reference = ReferenceGeneratorHelper.generate('BCF');
        createDto['statut'] = 'brouillon';

        const commande = manager.create(CommandeFournisseur, {
          ...createDto,
          user: tenantUser ?? undefined,
        } as any);
        const commandeSauvegardee = await manager.save(commande);

        const lignes = createDto.detail_commande.map((ligne: any) =>
          manager.create(DetailCommandeFournisseur, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire,
            commande: commandeSauvegardee,
          })
        );
        await manager.save(lignes);

        return commandeSauvegardee;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: { boutique: number; page?: number; limit?: number }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.commandeRepository.findAndCount({
      where: { boutique: { id: query.boutique } },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<CommandeFournisseur> {
    const commande = await this.commandeRepository.findOne({
      where: { id },
      relations: ['detail_commande', 'fournisseur', 'boutique', 'user'],
    });
    if (!commande) throw new NotFoundException('Commande fournisseur inexistante');
    return commande;
  }

  async updateStatut(id: number, statut: StatutCommandeFournisseur): Promise<CommandeFournisseur> {
    const commande = await this.findOne(id);
    commande.statut = statut;
    return this.commandeRepository.save(commande);
  }

  async update(id: number, updateDto: any): Promise<CommandeFournisseur> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const commande = await manager.preload(CommandeFournisseur, { id, ...updateDto });
        if (!commande) throw new Error('Commande introuvable');

        if (updateDto.detail_commande) {
          await manager.delete(DetailCommandeFournisseur, { commande: { id } });
          const lignes = updateDto.detail_commande.map((ligne: any) =>
            manager.create(DetailCommandeFournisseur, {
              produit: ligne.produit,
              quantite: ligne.quantite,
              prix_unitaire: ligne.prix_unitaire,
              commande,
            })
          );
          await manager.save(lignes);
        }

        return manager.save(commande);
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // Réception de la commande → crée un achat et met à jour le stock
  async recevoirCommande(id: number): Promise<any> {
    const commande = await this.findOne(id);

    if (commande.statut === 'annule') {
      throw new BadRequestException('Impossible de recevoir une commande annulée');
    }
    if (commande.statut === 'recu_total') {
      throw new BadRequestException('Cette commande a déjà été entièrement reçue');
    }

    const achatDto: any = {
      boutique: commande.boutique,
      fournisseur: commande.fournisseur,
      montant_total: commande.montant_total,
      statut: 'validé',
      user: (commande as any).user?.telephone ?? null,
      detail_achat: commande.detail_commande.map((d) => ({
        produit: d.produit.id,
        quantite: d.quantite,
        prix_unitaire: d.prix_unitaire,
      })),
    };

    const achat = await this.achatService.create(achatDto);

    await this.commandeRepository.update(id, { statut: 'recu_total' });

    return achat;
  }

  remove(id: number) {
    return this.commandeRepository.softDelete(id);
  }
}
