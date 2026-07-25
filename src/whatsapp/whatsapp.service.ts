import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WhatsappLog } from './entities/whatsapp-log.entity';

export interface VenteWhatsappData {
  reference: string;
  date_vente?: Date | string;
  nom_boutique?: string;
  phone_boutique?: string;
  nom_client?: string;
  telephone_client?: string;
  detail_vente: { produit: string; quantite: number; prix: number }[];
  montant_total: number;
  remise?: number;
  montant_total_apres_remise?: number;
  montant_recu?: number;
  monnaie_rendu?: number;
  mode_paiement?: string;
  statut?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly API_URL = 'https://wasenderapi.com/api/send-message';

  constructor(
    @InjectRepository(WhatsappLog)
    private readonly logRepo: Repository<WhatsappLog>,
  ) {}

  private get token(): string {
    return process.env.WASENDER_TOKEN ?? '';
  }

  // ─── Phone normalization ────────────────────────────────────────────────────

  normaliserNumero(telephone: string): string | null {
    if (!telephone) return null;
    // Supprimer espaces, tirets, parenthèses, points
    const clean = telephone.replace(/[\s\-().]/g, '');

    // Déjà au format international
    if (clean.startsWith('+')) return clean;

    // 00225XXXXXXXXXX → +225XXXXXXXXXX
    if (clean.startsWith('00225')) return `+${clean.slice(2)}`;

    // 00XX... → +XX...
    if (clean.startsWith('00')) return `+${clean.slice(2)}`;

    // 225XXXXXXXXXX (indicatif CI sans +, ex: 2250759947136)
    if (clean.startsWith('225') && clean.length >= 12) return `+${clean}`;

    // CI format local 10 chiffres commençant par 0 (ex: 0759947136)
    if (/^0\d{9}$/.test(clean)) return `+225${clean}`;

    // CI format local 9 chiffres sans le 0 initial (ex: 759947136 → commence par 1, 5 ou 7)
    if (/^[157]\d{8}$/.test(clean)) return `+225${clean}`;

    // Numéro non reconnu
    return null;
  }

  // ─── Envoi brut ─────────────────────────────────────────────────────────────

  async envoyer(
    destinataire: string,
    message: string,
    opts?: { structureId?: number; type?: string },
  ): Promise<WhatsappLog> {
    const numero = this.normaliserNumero(destinataire);
    const log = this.logRepo.create({
      destinataire: numero ?? destinataire,
      message,
      structureId: opts?.structureId ?? null,
      type: opts?.type ?? 'manuel',
      statut: 'en_attente',
    });
    console.log(`Envoi WhatsApp à ${numero ?? destinataire} [${opts?.type ?? 'manuel'}]`);
    if (!numero) {
      log.statut = 'echec';
      log.erreur = `Numéro invalide: ${destinataire}`;
      this.logger.warn(`Numéro WhatsApp invalide: ${destinataire}`);
      return this.logRepo.save(log);
    }

    if (!this.token) {
      log.statut = 'echec';
      log.erreur = 'WASENDER_TOKEN non configuré';
      this.logger.error('WASENDER_TOKEN manquant dans .env');
      return this.logRepo.save(log);
    }

    try {
      await axios.post(
        this.API_URL,
        { to: numero, text: message },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      log.statut = 'envoye';
      this.logger.log(`WhatsApp envoyé à ${numero} [${opts?.type ?? 'manuel'}]`);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      const detail = typeof apiMsg === 'object' ? JSON.stringify(apiMsg) : String(apiMsg);
      log.statut = 'echec';
      log.erreur = detail;
      this.logger.error(
        `Échec WhatsApp | original: ${destinataire} | normalisé: ${numero} | erreur: ${detail}`,
      );
    }

    return this.logRepo.save(log);
  }

  // ─── Envoi document (PDF) ───────────────────────────────────────────────────

  async envoyerDocument(
    destinataire: string,
    documentUrl: string,
    fileName: string,
    opts?: { structureId?: number; type?: string },
  ): Promise<WhatsappLog> {
    const numero = this.normaliserNumero(destinataire);
    const log = this.logRepo.create({
      destinataire: numero ?? destinataire,
      message: `[Document] ${fileName} → ${documentUrl}`,
      structureId: opts?.structureId ?? null,
      type: opts?.type ?? 'document',
      statut: 'en_attente',
    });

    if (!numero) {
      log.statut = 'echec';
      log.erreur = `Numéro invalide: ${destinataire}`;
      return this.logRepo.save(log);
    }

    if (!this.token) {
      log.statut = 'echec';
      log.erreur = 'WASENDER_TOKEN non configuré';
      return this.logRepo.save(log);
    }

    try {
      await axios.post(
        this.API_URL,
        { to: numero, documentUrl, fileName },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );
      log.statut = 'envoye';
      this.logger.log(`WhatsApp document envoyé à ${numero}: ${fileName}`);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      const detail = typeof apiMsg === 'object' ? JSON.stringify(apiMsg) : String(apiMsg);
      log.statut = 'echec';
      log.erreur = detail;
      this.logger.error(`Échec WhatsApp document | original: ${destinataire} | normalisé: ${numero} | erreur: ${detail}`);
    }

    return this.logRepo.save(log);
  }

  // ─── Notification courte après vente ────────────────────────────────────────

  async notifierVente(
    vente: VenteWhatsappData,
    opts?: { structureId?: number },
  ): Promise<void> {
    const tel = vente.telephone_client;
    if (!tel) return;

    const montant = vente.montant_total_apres_remise ?? vente.montant_total;
    const date = vente.date_vente
      ? new Date(vente.date_vente).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR');

    const message =
      `✅ *Achat confirmé — ${vente.nom_boutique ?? 'Boutique'}*\n` +
      `Bonjour ${vente.nom_client ?? 'cher client'} 👋\n\n` +
      `Votre achat du ${date} a bien été enregistré.\n` +
      `Réf : *${vente.reference}*\n` +
      `Montant : *${this.fmt(montant)} FCFA*\n\n` +
      `Merci pour votre confiance ! 🙏`;

    await this.envoyer(tel, message, { structureId: opts?.structureId, type: 'notification_vente' });
  }

  // ─── Reçu complet par WhatsApp ───────────────────────────────────────────────

  async envoyerRecu(
    vente: VenteWhatsappData,
    opts?: { structureId?: number },
  ): Promise<void> {
    const tel = vente.telephone_client;
    if (!tel) return;

    const montant = vente.montant_total_apres_remise ?? vente.montant_total;
    const remise  = vente.remise ?? 0;
    const date = vente.date_vente
      ? new Date(vente.date_vente).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      : new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

    const lignes = (vente.detail_vente ?? [])
      .map(l => `  • ${l.produit} x${l.quantite} → ${this.fmt(l.prix * l.quantite)} FCFA`)
      .join('\n');

    const modeLabel: Record<string, string> = {
      espece: 'Espèces', carte: 'Carte', orange_money: 'Orange Money',
      wave: 'Wave', mtn_money: 'MTN Money', moov_money: 'Moov Money',
      dajmo: 'Dajmo', credit: 'Crédit', mixte: 'Mixte',
    };

    const message =
      `🧾 *Reçu de vente*\n` +
      `*${vente.nom_boutique ?? 'Boutique'}*\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `Réf : *${vente.reference}*\n` +
      `Date : ${date}\n\n` +
      `*Articles :*\n${lignes}\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `Sous-total : ${this.fmt(vente.montant_total)} FCFA\n` +
      (remise > 0 ? `Remise : -${this.fmt(remise)} FCFA\n` : '') +
      `*Total : ${this.fmt(montant)} FCFA*\n` +
      (vente.montant_recu ? `Reçu : ${this.fmt(vente.montant_recu)} FCFA\n` : '') +
      (vente.monnaie_rendu ? `Rendu : ${this.fmt(vente.monnaie_rendu)} FCFA\n` : '') +
      `Mode : ${modeLabel[vente.mode_paiement ?? ''] ?? vente.mode_paiement ?? '—'}\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `Merci pour votre achat ! 🙏` +
      (vente.phone_boutique ? `\n📞 ${vente.phone_boutique}` : '');

    await this.envoyer(tel, message, { structureId: opts?.structureId, type: 'recu_vente' });
  }

  // ─── Historique ─────────────────────────────────────────────────────────────

  async getLogs(opts?: { structureId?: number; type?: string; limit?: number }) {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .orderBy('l.created_at', 'DESC')
      .take(opts?.limit ?? 100);

    if (opts?.structureId) qb.andWhere('l.structureId = :sid', { sid: opts.structureId });
    if (opts?.type)        qb.andWhere('l.type = :type', { type: opts.type });

    return qb.getMany();
  }

  // ─── Utilitaire ─────────────────────────────────────────────────────────────

  private fmt(n: number): string {
    return Math.round(n ?? 0).toLocaleString('fr-FR');
  }
}
