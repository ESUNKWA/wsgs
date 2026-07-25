import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ResponseService } from 'src/services/response/response.service';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class EnvoyerDto {
  @IsNotEmpty()
  @IsString()
  telephone!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;
}

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('envoyer')
  async envoyer(@Body() dto: EnvoyerDto, @Req() req: any) {
    const structureId: number | undefined = req.user?.structure_id ?? undefined;
    const log = await this.whatsappService.envoyer(dto.telephone, dto.message, {
      structureId,
      type: dto.type ?? 'manuel',
    });
    return this.responseService.success('Message WhatsApp traité', log);
  }

  @Get('logs')
  async getLogs(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const structureId: number | undefined = req?.user?.structure_id ?? undefined;
    const logs = await this.whatsappService.getLogs({
      structureId,
      type,
      limit: limit ? +limit : 100,
    });
    return this.responseService.success('Historique WhatsApp', logs);
  }
}
