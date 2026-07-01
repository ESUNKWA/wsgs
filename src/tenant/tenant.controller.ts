import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ResponseService } from 'src/services/response/response.service';

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('provision')
  async provision(@Body() dto: CreateTenantDto) {
    const data = await this.tenantService.provision(dto);
    return this.responseService.success('Base de données créée et configurée avec succès', data);
  }

  @Get()
  async findAll() {
    const data = await this.tenantService.findAll();
    return this.responseService.success('Configurations tenant', data);
  }

  @Get(':structureId')
  async getConfig(@Param('structureId') structureId: string) {
    const data = await this.tenantService.getConfig(+structureId);
    return this.responseService.success('Configuration tenant', data);
  }

  @Put(':structureId/reseed')
  async reseed(@Param('structureId') structureId: string) {
    await this.tenantService.reseedTenant(+structureId);
    return this.responseService.success('Profils et structure resynchronisés dans le tenant', null);
  }

  @Delete(':structureId/reset')
  async resetConnection(@Param('structureId') structureId: string) {
    await this.tenantService.destroyConnection(+structureId);
    return this.responseService.success('Connexion réinitialisée', null);
  }
}
