import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ModuleStructureService } from './module-structure.service';
import { ModuleCode } from './entities/module-structure.entity';

@Controller('module-structure')
export class ModuleStructureController {
  constructor(private readonly service: ModuleStructureService) {}

  @Get(':structureId')
  findAll(@Param('structureId', ParseIntPipe) structureId: number) {
    return this.service.findByStructure(structureId);
  }

  @Put(':structureId')
  update(
    @Param('structureId', ParseIntPipe) structureId: number,
    @Body() body: { modules: { module: ModuleCode; est_actif: boolean }[] },
  ) {
    return this.service.updateModules(structureId, body.modules);
  }

  @Put(':structureId/init')
  init(@Param('structureId', ParseIntPipe) structureId: number) {
    return this.service.initForStructure(structureId);
  }
}
