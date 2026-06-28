import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CommandeClient, StatutCommandeClient } from './entities/commande-client.entity';
import { DetailCommandeClient } from './entities/detail-commande-client.entity';
import { CreateCommandeClientDto } from './dto/create-commande-client.dto';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Client } from '../client/entities/client.entity';
import { VenteService } from '../vente/vente.service';

@Injectable()
export class CommandeClientService {

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CommandeClient)
    private commandeRepository: Repository<CommandeClient>,
    private readonly venteService: VenteService,
  ) {}

  async create(createDto: CreateCommandeClientDto): Promise<CommandeClient> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        let client: Client | null = null;
        if (createDto.clientdata?.telephone) {
          const existing = await manager.findOne(Client, {
            where: { telephone: createDto.clientdata.telephone },
          });
          client = existing ?? await manager.save(manager.create(Client, createDto.clientdata));
        } else if (createDto.clientdata) {
          client = await manager.save(manager.create(Client, createDto.clientdata));
        }

        createDto.reference = ReferenceGeneratorHelper.generate('CLC');
        createDto['statut'] = 'en_attente';
        if (client) createDto.client = client;

        const commande = manager.create(CommandeClient, createDto);
        const commandeSauvegardee = await manager.save(commande);

        const lignes = createDto.detail_commande.map((ligne: any) =>
          manager.create(DetailCommandeClient, {
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

  async findOne(id: number): Promise<CommandeClient> {
    const commande = await this.commandeRepository.findOne({
      where: { id },
      relations: ['detail_commande', 'client', 'boutique'],
    });
    if (!commande) throw new NotFoundException('Commande client inexistante');
    return commande;
  }

  async updateStatut(id: number, statut: StatutCommandeClient): Promise<CommandeClient> {
    const commande = await this.findOne(id);
    commande.statut = statut;
    return this.commandeRepository.save(commande);
  }

  async update(id: number, updateDto: any): Promise<CommandeClient> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const commande = await manager.preload(CommandeClient, { id, ...updateDto });
        if (!commande) throw new Error('Commande introuvable');

        if (updateDto.detail_commande) {
          await manager.delete(DetailCommandeClient, { commande: { id } });
          const lignes = updateDto.detail_commande.map((ligne: any) =>
            manager.create(DetailCommandeClient, {
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

  // Confirmer la commande → crée une vente et déduit le stock
  async confirmerLivraison(id: number): Promise<any> {
    const commande = await this.findOne(id);

    if (commande.statut === 'annule') {
      throw new BadRequestException('Impossible de livrer une commande annulée');
    }
    if (commande.statut === 'livre') {
      throw new BadRequestException('Cette commande a déjà été livrée');
    }

    const venteDto: any = {
      boutique: commande.boutique,
      client: commande.client,
      clientdata: commande.client
        ? { nom: commande.client.nom, telephone: commande.client.telephone, email: commande.client.email }
        : null,
      montant_total: commande.montant_total,
      montant_total_apres_remise: commande.montant_total_apres_remise,
      remise: commande.remise,
      statut: 'validé',
      detail_vente: commande.detail_commande.map((d) => ({
        produit: d.produit.id,
        quantite: d.quantite,
        prix_unitaire_vente: d.prix_unitaire,
      })),
      user: commande.user,
    };

    const result = await this.venteService.create(venteDto);

    await this.commandeRepository.update(id, { statut: 'livre' });

    return result;
  }

  remove(id: number) {
    return this.commandeRepository.softDelete(id);
  }
}
