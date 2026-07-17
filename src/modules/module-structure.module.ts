import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleStructure } from './entities/module-structure.entity';
import { ModuleStructureService } from './module-structure.service';
import { ModuleStructureController } from './module-structure.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleStructure])],
  controllers: [ModuleStructureController],
  providers: [ModuleStructureService],
  exports: [ModuleStructureService],
})
export class ModuleStructureModule {}
