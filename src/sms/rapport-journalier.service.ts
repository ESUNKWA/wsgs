import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SmsService } from './sms.service';
import { Abonnement } from 'src/abonnement/entities/abonnement.entity';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { TenantService } from 'src/tenant/tenant.service';
import { Vente } from 'src/gestion-ventes/vente/entities/vente.entity';
import { Produit } from 'src/config/produit/entities/produit.entity';
import { Boutique } from 'src/gestion-boutiques/boutique/entities/boutique.entity';

@Injectable()
export class RapportJournalierService {
  private readonly logger = new Logger(RapportJournalierService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly tenantService: TenantService,
    @InjectDataSource()
    private readonly masterDs: DataSource,
    @InjectRepository(Abonnement)
    private readonly abonnementRepo: Repository<Abonnement>,
    @InjectRepository(Structure)
    private readonly structureRepo: Repository<Structure>,
  ) {}

  // Envoi tous les jours à 20h00 (heure serveur)
  @Cron('0 20 * * *')
  async envoyerRapportsJournaliers(): Promise<void> {
    this.logger.log('Démarrage des rapports journaliers SMS...');

    const abosActifs = await this.abonnementRepo.find({
      where: { statut: 'actif' },
      select: ['structureId'],
    });

    const structureIds = [...new Set(abosActifs.map(a => a.structureId))];
    this.logger.log(`${structureIds.length} structure(s) active(s) trouvée(s)`);

    for (const structureId of structureIds) {
      try {
        await this.envoyerRapportPourStructure(structureId);
      } catch (err: any) {
        this.logger.error(`Erreur rapport structure ${structureId}: ${err?.message}`);
      }
    }

    this.logger.log('Rapports journaliers SMS terminés');
  }

  /** Envoi vers un destinataire précis (déclenchement manuel depuis le POS) */
  async envoyerRapportPourDestinataire(structureId: number, destinataire: string): Promise<any> {
    return this.envoyerRapportPourStructure(structureId, destinataire);
  }

  private async envoyerRapportPourStructure(structureId: number, destinataireOverride?: string): Promise<any> {
    const structure = await this.structureRepo.findOne({ where: { id: structureId } });
    const destinataire = destinataireOverride ?? structure?.telephone;

    if (!destinataire) {
      this.logger.warn(`Structure ${structureId} sans numéro de téléphone — ignorée`);
      return null;
    }

    let tenantDs: DataSource;
    try {
      tenantDs = await this.tenantService.getDataSource(structureId);
    } catch {
      this.logger.warn(`Pas de base tenant pour structure ${structureId} — ignorée`);
      return null;
    }

    const aujourd_hui = new Date();
    const debut = new Date(aujourd_hui);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(aujourd_hui);
    fin.setHours(23, 59, 59, 999);

    const ventes = await tenantDs.getRepository(Vente)
      .createQueryBuilder('v')
      .where('v.created_at BETWEEN :debut AND :fin', { debut, fin })
      .andWhere("v.statut != 'annulee'")
      .select(['v.montant_total_apres_remise', 'v.montant_total'])
      .getMany();

    const nbVentes = ventes.length;
    const caTotal = ventes.reduce(
      (sum, v) => sum + (v.montant_total_apres_remise || v.montant_total || 0),
      0,
    );

    const produitsBas = await tenantDs.getRepository(Produit)
      .createQueryBuilder('p')
      .where('p.stock_disponible <= p.seuil_alert')
      .andWhere('p.seuil_alert IS NOT NULL')
      .getCount();

    const boutique = await tenantDs.getRepository(Boutique).findOne({
      where: {},
      order: { id: 'ASC' },
      select: ['nom'],
    });

    const date = aujourd_hui.toLocaleDateString('fr-CI', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const message = this.buildMessage({
      boutique: boutique?.nom ?? structure?.nom ?? '',
      date,
      nbVentes,
      caTotal,
      produitsBas,
    });

    return this.smsService.envoyer(destinataire, message, {
      structureId,
      type: 'rapport_journalier',
    });
  }

  private buildMessage(data: {
    boutique: string;
    date: string;
    nbVentes: number;
    caTotal: number;
    produitsBas: number;
  }): string {
    const ca = Math.round(data.caTotal).toLocaleString('fr-CI');
    const ligneStock = data.produitsBas > 0
      ? `\nStock bas: ${data.produitsBas} produit(s)`
      : '';

    return `[NeuStock] ${data.date}\n${data.boutique}\nVentes: ${data.nbVentes} | CA: ${ca} XOF${ligneStock}`;
  }
}
