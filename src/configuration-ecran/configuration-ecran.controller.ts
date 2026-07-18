import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ConfigurationEcranService } from './configuration-ecran.service';
import { UpsertConfigurationEcranDto } from './dto/upsert-configuration-ecran.dto';

@Controller('configuration-ecran')
export class ConfigurationEcranController {
  constructor(private readonly service: ConfigurationEcranService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Crée ou met à jour une configuration (upsert par boutique_type + profil_code) */
  @Post()
  upsert(@Body() dto: UpsertConfigurationEcranDto) {
    return this.service.upsert(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
