import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TableRestaurantService } from './table.service';
import { ResponseService } from 'src/services/response/response.service';
import { StatutTable } from './entities/table.entity';

@Controller('restaurant/tables')
export class TableRestaurantController {
  constructor(
    private readonly tableService: TableRestaurantService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    const data = await this.tableService.create(dto);
    return this.responseService.success('Table créée', data);
  }

  @Get()
  async findAll(@Query('boutique') boutique: string) {
    const data = await this.tableService.findAll(+boutique);
    return this.responseService.success('Tables', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tableService.findOne(+id);
    return this.responseService.success('Table', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const data = await this.tableService.update(+id, dto);
    return this.responseService.success('Table modifiée', data);
  }

  @Patch(':id/statut')
  async changerStatut(@Param('id') id: string, @Body('statut') statut: StatutTable) {
    const data = await this.tableService.changerStatut(+id, statut);
    return this.responseService.success('Statut mis à jour', data);
  }

  @Patch(':id/acquitter-appel')
  async acquitterAppel(@Param('id') id: string) {
    const data = await this.tableService.acquitterAppel(+id);
    return this.responseService.success('Appel acquitté', data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.tableService.remove(+id);
    return this.responseService.success('Table supprimée', data);
  }
}
