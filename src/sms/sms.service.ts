import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { SmsLog } from './entities/sms-log.entity';

interface OrangeToken {
  access_token: string;
  expires_at: number; // timestamp ms
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private tokenCache: OrangeToken | null = null;

  private get basicToken(): string {
    const user = process.env.ORANGE_SMS_USERNAME ?? '';
    const pass = process.env.ORANGE_SMS_PASSWORD ?? '';
    return Buffer.from(`${user}:${pass}`).toString('base64');
  }

  private get sender(): string {
    return process.env.ORANGE_SMS_SENDER ?? '';
  }

  constructor(
    @InjectRepository(SmsLog)
    private readonly smsLogRepo: Repository<SmsLog>,
  ) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expires_at > now + 60_000) {
      return this.tokenCache.access_token;
    }

    const res = await axios.post(
      'https://api.orange.com/oauth/v3/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.basicToken}`,
        },
      },
    );

    const { access_token, expires_in } = res.data;
    this.tokenCache = {
      access_token,
      expires_at: now + (expires_in ?? 3600) * 1000,
    };

    this.logger.log('Token Orange SMS renouvelé');
    return access_token;
  }

  // ─── Envoi SMS ────────────────────────────────────────────────────────────

  async envoyer(
    destinataire: string,
    message: string,
    opts?: { structureId?: number; type?: string },
  ): Promise<SmsLog> {
    const log = this.smsLogRepo.create({
      destinataire,
      message,
      structureId: opts?.structureId ?? null,
      type: opts?.type ?? 'manuel',
      statut: 'en_attente',
    });

    try {
      const token = await this.getAccessToken();
      const senderEncoded = encodeURIComponent(this.sender);

      const res = await axios.post(
        `https://api.orange.com/smsmessaging/v1/outbound/${senderEncoded}/requests`,
        {
          outboundSMSMessageRequest: {
            address: `tel:${destinataire}`,
            senderAddress: this.sender,
            outboundSMSTextMessage: { message },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      log.statut = 'envoye';
      log.orangeResourceUrl =
        res.data?.outboundSMSMessageRequest?.resourceURL ?? null;

      this.logger.log(`SMS envoyé à ${destinataire} [${opts?.type ?? 'manuel'}]`);
    } catch (err: any) {
      const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
      log.statut = 'echec';
      log.erreur = detail;
      this.logger.error(`Échec envoi SMS à ${destinataire}: ${detail}`);
    }

    return this.smsLogRepo.save(log);
  }

  // ─── Historique ───────────────────────────────────────────────────────────

  async getLogs(opts?: { structureId?: number; type?: string; limit?: number }) {
    const qb = this.smsLogRepo
      .createQueryBuilder('l')
      .orderBy('l.created_at', 'DESC')
      .take(opts?.limit ?? 100);

    if (opts?.structureId) qb.andWhere('l.structureId = :sid', { sid: opts.structureId });
    if (opts?.type)        qb.andWhere('l.type = :type', { type: opts.type });

    return qb.getMany();
  }
}
