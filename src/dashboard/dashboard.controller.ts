import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getStatsBoutique(@Query('boutique') boutique: string) {
    const boutiqueId = parseInt(boutique, 10);
    if (!boutique || isNaN(boutiqueId)) throw new BadRequestException('Paramètre boutique requis');
    return await this.dashboardService.getDashboardStats(boutiqueId);
  }

  @Get('caissier')
  async getDashboardCaissier(
    @Query('boutique') boutiqueId: string,
    @Query('caissier') caissier: string,
  ) {
    const id = parseInt(boutiqueId, 10);
    if (!boutiqueId || isNaN(id)) throw new BadRequestException('Paramètre boutique requis');
    return await this.dashboardService.getDashboardCaissier(id, caissier);
  }

  @Post()
  create(@Body() createDashboardDto: CreateDashboardDto) {
    return this.dashboardService.create(createDashboardDto);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dashboardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDashboardDto: UpdateDashboardDto) {
    return this.dashboardService.update(+id, updateDashboardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dashboardService.remove(+id);
  }
}
