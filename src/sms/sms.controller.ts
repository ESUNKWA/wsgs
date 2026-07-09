import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SmsService } from './sms.service';
import { RapportJournalierService } from './rapport-journalier.service';
import { ResponseService } from 'src/services/response/response.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly rapportService: RapportJournalierService,
    private readonly responseService: ResponseService,
    private readonly tenantCtx: TenantContextService,
  ) {}

  /** Envoyer un SMS manuellement */
  @Post('envoyer')
  async envoyer(
    @Body() body: { destinataire: string; message: string; structureId?: number },
  ) {
    const log = await this.smsService.envoyer(body.destinataire, body.message, {
      structureId: body.structureId,
      type: 'manuel',
    });
    return this.responseService.success('SMS traité', log);
  }

  /** Déclencher manuellement les rapports journaliers avec destinataire optionnel */
  @Post('rapport-journalier/envoyer')
  async envoyerRapports(@Body() body?: { destinataire?: string }) {
    if (body?.destinataire) {
      const structureId = this.tenantCtx.getStructureId();
      if (!structureId) {
        return this.responseService.error('Aucun contexte tenant actif');
      }
      const log = await this.rapportService.envoyerRapportPourDestinataire(structureId, body.destinataire);
      return this.responseService.success('Rapport journalier envoyé', log);
    }
    await this.rapportService.envoyerRapportsJournaliers();
    return this.responseService.success('Rapports journaliers envoyés', null);
  }

  /** Historique des SMS envoyés */
  @Get('logs')
  async getLogs(
    @Query('structureId') structureId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.smsService.getLogs({
      structureId: structureId ? +structureId : undefined,
      type,
      limit: limit ? +limit : 100,
    });
    return this.responseService.success('Logs SMS', logs);
  }
}
