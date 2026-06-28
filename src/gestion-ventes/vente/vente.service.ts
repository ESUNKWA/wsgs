import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateVenteDto } from './dto/create-vente.dto';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Vente } from './entities/vente.entity';
import { DetailVente } from '../detail-vente/entities/detail-vente.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Client } from '../client/entities/client.entity';
import { formatVente } from 'src/common/helpers/formatVente';
import { SessionCaisse } from 'src/gestion-caisse/entities/session-caisse.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@Injectable()
export class VenteService {

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Vente) private venteRepository: Repository<Vente>,
  ) {}

  async create(createVenteDto: CreateVenteDto): Promise<any> {
    try {
      return await this.dataSource.transaction(async (manager) => {

        // Réutilise le client existant par téléphone, sinon en crée un nouveau
        let registerClient: Client;
        if (createVenteDto.clientdata?.telephone) {
          const existing = await manager.findOne(Client, {
            where: { telephone: createVenteDto.clientdata.telephone },
          });
          registerClient = existing ?? await manager.save(manager.create(Client, createVenteDto.clientdata));
        } else {
          registerClient = await manager.save(manager.create(Client, createVenteDto.clientdata));
        }

        createVenteDto.reference = ReferenceGeneratorHelper.generate('VNT');
        createVenteDto.client = registerClient;

        // Gestion caisse : session par caissier (option B)
        const boutiqueId = (createVenteDto.boutique as any)?.id ?? createVenteDto.boutique;
        const userId = (createVenteDto.user as any)?.id ?? createVenteDto.user;
        const boutique = await manager.findOne(Boutique, { where: { id: boutiqueId } });
        let sessionActive: SessionCaisse | null = null;
        if (boutique?.gestion_caisse_activee) {
          sessionActive = await manager.findOne(SessionCaisse, {
            where: {
              boutique: { id: boutiqueId },
              caissier: { id: userId },
              statut: 'ouverte',
            },
          });
          if (!sessionActive) {
            throw new BadRequestException(
              'Vous devez ouvrir votre session de caisse avant de pouvoir enregistrer une vente.',
            );
          }
        }

        const vente = manager.create(Vente, {
          ...createVenteDto,
          session_caisse: sessionActive,
        } as any);
        const venteSauvegarde = await manager.save(vente);

        const lignes = createVenteDto.detail_vente.map((ligne: any) =>
          manager.create(DetailVente, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            prix_unitaire_vente: ligne.prix_unitaire_vente,
            vente,
          })
        );
        await manager.save(lignes);

        // Charger les produits avant modification du stock pour capturer stock_avant
        const produitsIds = createVenteDto.detail_vente.map((l: any) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds) });

        const lignesHistorik = createVenteDto.detail_vente.map((ligne: any) => {
          const produit = produits.find((p) => p.id == ligne.produit);
          const stock_avant = produit?.stock_disponible ?? 0;
          return manager.create(HistoriqueStock, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            mouvement: 'sortie',
            source: 'vente',
            vente,
            stock_avant,
            stock_apres: stock_avant - ligne.quantite,
            utilisateur: userId ? { id: userId } : undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = createVenteDto.detail_vente.find((l: any) => l.produit == produit.id);
          if (ligne) produit.stock_disponible -= ligne.quantite;
        }
        await manager.save(Produit, produits);

        createVenteDto.date_vente = venteSauvegarde?.created_at;
        const venteFormattee = formatVente(createVenteDto);
        await manager.update(Vente, venteSauvegarde.id, { recu_data: venteFormattee });

        return { idVente: venteSauvegarde.id };
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

    const [items, total] = await this.venteRepository.findAndCount({
      where: { boutique: { id: query.boutique } },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Vente> {
    const vente = await this.venteRepository.findOne({
      where: { id },
      relations: ['detail_vente'],
    });
    if (!vente) throw new NotFoundException('Vente inexistante');
    return vente;
  }

  async update(id: number, updateVenteDto: any): Promise<Vente> {
    try {
      return await this.dataSource.transaction(async (manager) => {

        if (updateVenteDto.client?.id) {
          const client = await manager.preload(Client, {
            id: updateVenteDto.client.id,
            ...updateVenteDto.client,
          });
          if (client) await manager.save(client);
        }

        const vente = await manager.preload(Vente, { id, ...updateVenteDto });
        if (!vente) throw new Error('Vente introuvable');

        // Remettre le stock des anciennes lignes avant de les supprimer
        const oldLines = await manager.find(DetailVente, {
          where: { vente: { id } },
          relations: ['produit'],
        });
        if (oldLines.length > 0) {
          const oldProduitIds = [...new Set(oldLines.map((l) => l.produit.id))];
          const oldProduits = await manager.findBy(Produit, { id: In(oldProduitIds) });
          for (const p of oldProduits) {
            const l = oldLines.find((ol) => ol.produit.id === p.id);
            if (l) p.stock_disponible += l.quantite;
          }
          await manager.save(Produit, oldProduits);
        }

        await manager.delete(DetailVente, { vente: vente.id });
        await manager.delete(HistoriqueStock, { vente: vente.id });

        const lignes: DetailVente[] = updateVenteDto.detail_vente.map((ligne: any) => {
          const l = new DetailVente();
          l.produit = ligne.produit;
          l.quantite = ligne.quantite;
          l.prix_unitaire_vente = ligne.prix_unitaire_vente;
          l.vente = vente;
          return l;
        });

        await manager.save(Vente, vente);
        await manager.save(DetailVente, lignes);

        // Charger les produits avant modification du stock pour capturer stock_avant
        const produitsIds = updateVenteDto.detail_vente.map((l: any) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds) });

        const lignesHistorik = updateVenteDto.detail_vente.map((ligne: any) => {
          const produit = produits.find((p) => p.id === ligne.produit);
          const stock_avant = produit?.stock_disponible ?? 0;
          return manager.create(HistoriqueStock, {
            produit: ligne.produit,
            quantite: ligne.quantite,
            mouvement: 'sortie',
            source: 'vente',
            vente,
            stock_avant,
            stock_apres: stock_avant - ligne.quantite,
            utilisateur: updateVenteDto.user ? { id: (updateVenteDto.user as any)?.id ?? updateVenteDto.user } : undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = updateVenteDto.detail_vente.find((l: any) => l.produit === produit.id);
          if (ligne) produit.stock_disponible -= ligne.quantite;
        }
        await manager.save(Produit, produits);

        // Mettre à jour recu_data avec les nouvelles données
        const venteComplete = await manager.findOne(Vente, {
          where: { id },
          relations: ['boutique', 'client'],
        });
        const venteFormattee = formatVente({ ...updateVenteDto, ...venteComplete });
        await manager.update(Vente, id, { recu_data: venteFormattee });

        return vente;
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  remove(id: number) {
    return this.venteRepository.softDelete(id);
  }
}
