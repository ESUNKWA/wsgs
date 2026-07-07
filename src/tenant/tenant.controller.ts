import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ResponseService } from 'src/services/response/response.service';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';

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
    const data = await this.tenantService.findAllWithStructure();
    return this.responseService.success('Bases de données tenant', data);
  }

  @Get(':structureId/tables')
  async getTables(@Param('structureId') structureId: string) {
    const data = await this.tenantService.getTables(+structureId);
    return this.responseService.success('Tables de la base', data);
  }

  @Get(':structureId/tables/:tableName')
  async getTableContent(
    @Param('structureId') structureId: string,
    @Param('tableName') tableName: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const data = await this.tenantService.getTableContent(+structureId, tableName, +page, +limit);
    return this.responseService.success(`Contenu de ${tableName}`, data);
  }

  @Public()
  @Get('reseed-all')
  async reseedAll() {
    const data = await this.tenantService.reseedAll();
    return this.responseService.success('Tous les tenants resynchronisés', data);
  }

  @Public()
  @Post('migrate/mode-paiement')
  async migrateModePaiement() {
    const sql = [
      `ALTER TABLE t_ventes ALTER COLUMN r_mode_paiement TYPE character varying(30) USING r_mode_paiement::text`,
      `DROP TYPE IF EXISTS t_ventes_r_mode_paiement_enum`,
      `ALTER TABLE t_achats ALTER COLUMN r_mode_paiement TYPE character varying(30) USING r_mode_paiement::text`,
      `DROP TYPE IF EXISTS t_achats_r_mode_paiement_enum`,
    ];
    const data = await this.tenantService.runSqlOnAllTenants(sql);
    return this.responseService.success('Migration mode_paiement terminée', data);
  }

  @Get('storage')
  async getStorageStats() {
    const data = await this.tenantService.getStorageStats();
    return this.responseService.success('Stockage par tenant', data);
  }

  @Get(':structureId')
  async getConfig(@Param('structureId') structureId: string) {
    const data = await this.tenantService.getConfig(+structureId);
    return this.responseService.success('Configuration tenant', data);
  }

  @Put(':structureId/reseed')
  async reseed(@Param('structureId') structureId: string) {
    await this.tenantService.reseedTenant(+structureId);
    return this.responseService.success('Tenant resynchronisé', null);
  }

  @Delete(':structureId/reset')
  async resetConnection(@Param('structureId') structureId: string) {
    await this.tenantService.destroyConnection(+structureId);
    return this.responseService.success('Connexion réinitialisée', null);
  }
}
