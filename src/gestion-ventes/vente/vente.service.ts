import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateVenteDto } from './dto/create-vente.dto';
import { CreateVenteComptageDto } from './dto/create-vente-comptage.dto';
import { In } from 'typeorm';
import { HistoriqueStock } from 'src/gestion-achats/historique-stock/entities/historique-stock.entity';
import { Vente } from './entities/vente.entity';
import { DetailVente } from '../detail-vente/entities/detail-vente.entity';
import { ReferenceGeneratorHelper } from 'src/common/helpers/reference-generator.helper';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Client } from '../client/entities/client.entity';
import { formatVente } from 'src/common/helpers/formatVente';
import { SessionCaisse } from 'src/gestion-caisse/entities/session-caisse.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';
import { Utilisateur } from 'src/gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { EventsService } from 'src/events/events.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';

@Injectable()
export class VenteService {
  private readonly logger = new Logger(VenteService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly eventsService: EventsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  private get dataSource() { return this.tenantContext.getDataSource(); }
  private get venteRepository() { return this.dataSource.getRepository(Vente); }

  async create(createVenteDto: CreateVenteDto): Promise<any> {
    try {
      const boutiqueId = (createVenteDto.boutique as any)?.id ?? createVenteDto.boutique;
      const result = await this.dataSource.transaction(async (manager) => {

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

        const boutiqueId = (createVenteDto.boutique as any)?.id ?? createVenteDto.boutique;

        // Resolve the caissier/utilisateur by telephone (tenant-local id, not master id)
        const telephone = String((createVenteDto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
          if (!tenantUser) throw new BadRequestException(`Utilisateur introuvable (tél: ${telephone})`);
        }

        const boutique = await manager.findOne(Boutique, { where: { id: boutiqueId } });
        let sessionActive: SessionCaisse | null = null;
        if (boutique?.gestion_caisse_activee) {
          sessionActive = await manager.findOne(SessionCaisse, {
            where: {
              boutique: { id: boutiqueId },
              caissier: tenantUser ? { id: tenantUser.id } : undefined,
              statut: 'ouverte',
            },
          });
          if (!sessionActive) {
            throw new BadRequestException(
              'Vous devez ouvrir votre session de caisse avant de pouvoir enregistrer une vente.',
            );
          }
        }

        // Résoudre le vendeur réel (peut être différent du caissier connecté)
        const vendeurTel = String((createVenteDto as any).vendeur_tel ?? '').trim();
        let vendeur: Utilisateur | null = null;
        if (vendeurTel) {
          vendeur = await manager.findOne(Utilisateur, { where: { telephone: vendeurTel } });
        }

        const vente = manager.create(Vente, {
          ...createVenteDto,
          user: tenantUser ?? undefined,
          vendeur: vendeur ?? tenantUser ?? undefined,
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
            utilisateur: tenantUser ?? undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = createVenteDto.detail_vente.find((l: any) => l.produit == produit.id);
          if (ligne) produit.stock_disponible -= ligne.quantite;
        }
        await manager.save(Produit, produits);

        createVenteDto.date_vente = venteSauvegarde?.created_at;

        this.logger.log(`[RECU] venteId=${venteSauvegarde.id} boutique=${JSON.stringify({ id: boutique?.id, nom: boutique?.nom, logo: boutique?.logo ? 'oui' : 'non' })}`);
        this.logger.log(`[RECU] produits=${JSON.stringify(produits.map(p => ({ id: p.id, nom: p.nom })))}`);
        this.logger.log(`[RECU] detail_vente=${JSON.stringify(createVenteDto.detail_vente)}`);

        const venteFormattee = formatVente(
          { ...createVenteDto, boutique, reference: venteSauvegarde.reference },
          produits.map(p => ({ id: p.id, nom: p.nom })),
        );

        this.logger.log(`[RECU] recu_data produit=${JSON.stringify(venteFormattee)}`);

        await manager.update(Vente, venteSauvegarde.id, { recu_data: venteFormattee });

        return { idVente: venteSauvegarde.id, recu_data: venteFormattee };
      });
      // Notifier le dashboard en temps réel après commit de la transaction
      this.eventsService.emit(+boutiqueId, 'vente.created');

      // Notification WhatsApp client — fire-and-forget (ne bloque pas la réponse)
      if (result?.recu_data?.telephone_client) {
        const structureId: number | undefined = this.tenantContext.getStructureId() ?? undefined;
        this.whatsappService.notifierVente(result.recu_data, { structureId }).catch(() => null);
      }

      return result;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Vente issue d'un "point après vente" : le vendeur saisit la quantité restante
   * par produit, la quantité vendue et le montant par produit sont déduits automatiquement.
   */
  async createFromComptage(dto: CreateVenteComptageDto): Promise<any> {
    try {
      const boutiqueId = (dto.boutique as any)?.id ?? dto.boutique;
      const result = await this.dataSource.transaction(async (manager) => {
        const telephone = String((dto as any).user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
          if (!tenantUser) throw new BadRequestException(`Utilisateur introuvable (tél: ${telephone})`);
        }

        const boutique = await manager.findOne(Boutique, { where: { id: boutiqueId } });
        if (!boutique) throw new BadRequestException('Boutique introuvable');

        let sessionActive: SessionCaisse | null = null;
        if (boutique.gestion_caisse_activee) {
          sessionActive = await manager.findOne(SessionCaisse, {
            where: {
              boutique: { id: boutiqueId },
              caissier: tenantUser ? { id: tenantUser.id } : undefined,
              statut: 'ouverte',
            },
          });
          if (!sessionActive) {
            throw new BadRequestException(
              'Vous devez ouvrir votre session de caisse avant de pouvoir enregistrer un point de vente.',
            );
          }
        }

        const vendeurTel = String((dto as any).vendeur_tel ?? '').trim();
        let vendeur: Utilisateur | null = null;
        if (vendeurTel) {
          vendeur = await manager.findOne(Utilisateur, { where: { telephone: vendeurTel } });
        }

        if (!dto.lignes?.length) {
          throw new BadRequestException('Aucun produit compté');
        }

        const produitsIds = dto.lignes.map((l) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds), boutique: { id: boutiqueId } as any });

        const lignesCalculees = dto.lignes
          .map((ligne) => {
            const produit = produits.find((p) => p.id == ligne.produit);
            if (!produit) throw new BadRequestException(`Produit introuvable (id: ${ligne.produit})`);

            const stock_avant = produit.stock_disponible ?? 0;
            const quantite_restante = Number(ligne.quantite_restante);
            if (isNaN(quantite_restante) || quantite_restante < 0) {
              throw new BadRequestException(`Quantité restante invalide pour le produit "${produit.nom}"`);
            }

            const quantite_vendue = stock_avant - quantite_restante;
            if (quantite_vendue < 0) {
              throw new BadRequestException(
                `La quantité restante saisie pour "${produit.nom}" (${quantite_restante}) dépasse le stock disponible (${stock_avant}).`,
              );
            }

            const prix_unitaire_vente = ligne.prix_unitaire_vente ?? produit.prix_vente;
            return {
              produit,
              stock_avant,
              quantite_restante,
              quantite_vendue,
              prix_unitaire_vente,
              montant_ligne: quantite_vendue * prix_unitaire_vente,
            };
          })
          .filter((l) => l.quantite_vendue > 0);

        if (lignesCalculees.length === 0) {
          throw new BadRequestException(
            'Aucune vente détectée : les quantités restantes saisies correspondent au stock disponible.',
          );
        }

        const montant_total = lignesCalculees.reduce((sum, l) => sum + l.montant_ligne, 0);
        const remise = dto.remise ?? 0;
        const montant_total_apres_remise = montant_total - remise;

        const vente = manager.create(Vente, {
          reference: ReferenceGeneratorHelper.generate('VNT'),
          statut: dto.statut ?? 'payer',
          mode_paiement: dto.mode_paiement ?? 'espece',
          montant_total,
          remise,
          montant_total_apres_remise,
          montant_recu: dto.montant_recu,
          details_paiement: dto.details_paiement,
          boutique: { id: boutiqueId } as any,
          user: tenantUser ?? undefined,
          vendeur: vendeur ?? tenantUser ?? undefined,
          session_caisse: sessionActive,
        } as any);
        const venteSauvegarde = await manager.save(vente);

        const lignesDetail = lignesCalculees.map((l) =>
          manager.create(DetailVente, {
            produit: l.produit,
            quantite: l.quantite_vendue,
            prix_unitaire_vente: l.prix_unitaire_vente,
            vente,
          }),
        );
        await manager.save(lignesDetail);

        const lignesHistorik = lignesCalculees.map((l) =>
          manager.create(HistoriqueStock, {
            produit: l.produit,
            quantite: l.quantite_vendue,
            mouvement: 'sortie',
            source: 'vente',
            vente,
            stock_avant: l.stock_avant,
            stock_apres: l.quantite_restante,
            utilisateur: tenantUser ?? undefined,
          }),
        );
        await manager.save(lignesHistorik);

        for (const l of lignesCalculees) {
          l.produit.stock_disponible = l.quantite_restante;
        }
        await manager.save(Produit, lignesCalculees.map((l) => l.produit));

        const venteFormattee = formatVente(
          {
            detail_vente: lignesCalculees.map((l) => ({
              produit: l.produit,
              quantite: l.quantite_vendue,
              prix_unitaire_vente: l.prix_unitaire_vente,
            })),
            montant_total,
            remise,
            montant_recu: dto.montant_recu,
            montant_total_apres_remise,
            mode_paiement: vente.mode_paiement,
            statut: vente.statut,
            reference: venteSauvegarde.reference,
            date_vente: venteSauvegarde.created_at,
            boutique,
          },
          produits.map((p) => ({ id: p.id, nom: p.nom })),
        );

        await manager.update(Vente, venteSauvegarde.id, { recu_data: venteFormattee });

        return {
          idVente: venteSauvegarde.id,
          reference: venteSauvegarde.reference,
          recu_data: venteFormattee,
          lignes: lignesCalculees.map((l) => ({
            produit: l.produit.id,
            nom_produit: l.produit.nom,
            stock_avant: l.stock_avant,
            quantite_restante: l.quantite_restante,
            quantite_vendue: l.quantite_vendue,
            prix_unitaire_vente: l.prix_unitaire_vente,
            montant_ligne: l.montant_ligne,
          })),
        };
      });

      this.eventsService.emit(+boutiqueId, 'vente.created');

      return result;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(query: {
    boutique: number;
    reference?: string;
    montant?: number;
    date_debut?: string;
    date_fin?: string;
    utilisateur?: number;
    page?: number;
    limit?: number;
  }) {
    if (isNaN(query.boutique)) {
      throw new BadRequestException('Veuillez préciser la boutique.');
    }
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.dataSource.getRepository(Vente)
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.client', 'client')
      .leftJoinAndSelect('v.user', 'user')
      .leftJoinAndSelect('v.detail_vente', 'details')
      .leftJoinAndSelect('details.produit', 'produit')
      .where('v.boutiqueId = :boutiqueId', { boutiqueId: query.boutique });

    if (query.reference) {
      qb.andWhere('v.reference ILIKE :reference', { reference: `%${query.reference}%` });
    }
    if (query.montant !== undefined) {
      qb.andWhere('v.montant_total = :montant', { montant: query.montant });
    }
    if (query.date_debut) {
      qb.andWhere('v.created_at >= :date_debut', { date_debut: new Date(query.date_debut) });
    }
    if (query.date_fin) {
      const fin = new Date(query.date_fin);
      fin.setHours(23, 59, 59, 999);
      qb.andWhere('v.created_at <= :date_fin', { date_fin: fin });
    }
    if (query.utilisateur !== undefined) {
      qb.andWhere('v.userId = :utilisateur', { utilisateur: query.utilisateur });
    }

    const [items, total] = await qb
      .orderBy('v.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<Vente> {
    const vente = await this.venteRepository.findOne({
      where: { id },
      relations: ['detail_vente', 'detail_vente.produit', 'boutique', 'client'],
    });
    if (!vente) throw new NotFoundException('Vente inexistante');
    return vente;
  }

  async update(id: number, updateVenteDto: any): Promise<Vente> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Résolution du caissier par téléphone
        const telephone = String(updateVenteDto.user ?? '').trim();
        let tenantUser: Utilisateur | null = null;
        if (telephone) {
          tenantUser = await manager.findOne(Utilisateur, { where: { telephone } });
        }

        // Résolution / création du client
        let resolvedClient: Client | null = null;
        const clientdata = updateVenteDto.clientdata ?? updateVenteDto.client;
        if (clientdata?.telephone) {
          resolvedClient = await manager.findOne(Client, { where: { telephone: clientdata.telephone } });
          if (!resolvedClient) {
            resolvedClient = await manager.save(manager.create(Client, clientdata));
          }
        } else if (clientdata?.id) {
          const cl = await manager.preload(Client, { id: clientdata.id, ...clientdata });
          if (cl) resolvedClient = await manager.save(cl);
        }

        // Résoudre le vendeur réel si fourni
        const vendeurTelU = String(updateVenteDto.vendeur_tel ?? '').trim();
        let vendeurU: Utilisateur | null = null;
        if (vendeurTelU) {
          vendeurU = await manager.findOne(Utilisateur, { where: { telephone: vendeurTelU } });
        }

        // Séparer les champs scalaires des relations pour éviter les violations FK
        const { user: _u, vendeur_tel: _vt, boutique, session_caisse, client: _c, clientdata: _cd, detail_vente, ...scalarFields } = updateVenteDto;
        const boutiqueId = typeof boutique === 'object' ? boutique?.id : boutique;
        const sessionId  = typeof session_caisse === 'object' ? session_caisse?.id : session_caisse;

        const vente = await manager.preload(Vente, { id, ...scalarFields });
        if (!vente) throw new Error('Vente introuvable');

        // Affecter les relations résolues
        if (tenantUser)     vente.user          = tenantUser;
        if (vendeurU)       vente.vendeur        = vendeurU;
        else if (tenantUser && !vente.vendeur) vente.vendeur = tenantUser;
        if (boutiqueId)     vente.boutique       = { id: boutiqueId } as any;
        if (sessionId)      vente.session_caisse = { id: sessionId } as any;
        if (resolvedClient) vente.client         = resolvedClient;

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

        const lignes: DetailVente[] = detail_vente.map((ligne: any) => {
          const l = new DetailVente();
          l.produit = ligne.produit;
          l.quantite = ligne.quantite;
          l.prix_unitaire_vente = ligne.prix_unitaire_vente;
          l.vente = vente;
          return l;
        });

        await manager.save(Vente, vente);
        await manager.save(DetailVente, lignes);

        const produitsIds = detail_vente.map((l: any) => l.produit);
        const produits = await manager.findBy(Produit, { id: In(produitsIds) });

        const lignesHistorik = detail_vente.map((ligne: any) => {
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
            utilisateur: tenantUser ?? undefined,
          });
        });
        await manager.save(lignesHistorik);

        for (const produit of produits) {
          const ligne = detail_vente.find((l: any) => l.produit === produit.id);
          if (ligne) produit.stock_disponible -= ligne.quantite;
        }
        await manager.save(Produit, produits);

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

  async regulariser(
    id: number,
    dto: { mode_paiement: string; montant_recu: number; details_paiement?: any },
  ): Promise<Vente> {
    const vente = await this.venteRepository.findOne({ where: { id } });
    if (!vente) throw new NotFoundException('Vente introuvable');
    if (vente.statut !== 'non_payer')
      throw new BadRequestException('Cette vente est déjà réglée');

    const montantDu = vente.montant_total_apres_remise ?? vente.montant_total ?? 0;
    const monnaie   = Math.max(0, (dto.montant_recu ?? 0) - montantDu);

    await this.venteRepository.update(id, {
      statut:           'payer',
      mode_paiement:    dto.mode_paiement as any,
      montant_recu:     dto.montant_recu,
      monnaie_rendu:    monnaie,
      details_paiement: dto.details_paiement ?? null,
    });

    // Met à jour le recu_data pour que le reçu reflète le paiement
    const updated = await this.venteRepository.findOne({ where: { id }, relations: ['detail_vente'] });
    if (updated?.recu_data) {
      const recuData = {
        ...updated.recu_data,
        statut:        'payer',
        mode_paiement: dto.mode_paiement,
        montant_recu:  dto.montant_recu,
        monnaie_rendu: monnaie,
      };
      await this.venteRepository.update(id, { recu_data: recuData });
      updated.recu_data = recuData;
    }

    return updated!;
  }

  async envoyerRecuWhatsapp(
    id: number,
    opts?: { documentUrl?: string; nomFichier?: string },
  ): Promise<{ envoye: boolean; destinataire?: string }> {
    const vente = await this.venteRepository.findOne({ where: { id } });
    if (!vente) throw new NotFoundException('Vente introuvable');

    const recu = vente.recu_data;
    
    if (!recu?.telephone_client) {
      throw new BadRequestException('Aucun numéro de téléphone client pour cette vente');
    }

    const structureId: number | undefined = this.tenantContext.getStructureId() ?? undefined;

    if (opts?.documentUrl) {
      // Envoyer le PDF comme document WhatsApp
      await this.whatsappService.envoyerDocument(
        recu.telephone_client,
        opts.documentUrl,
        opts.nomFichier ?? `Reçu_${recu.reference ?? id}.pdf`,
        { structureId, type: 'recu_vente' },
      );
    } else {
      // Envoyer le reçu formaté en texte
      await this.whatsappService.envoyerRecu(recu, { structureId });
    }

    const numero = this.whatsappService.normaliserNumero(recu.telephone_client);
    return { envoye: true, destinataire: numero ?? recu.telephone_client };
  }

  remove(id: number) {
    return this.venteRepository.softDelete(id);
  }
}
