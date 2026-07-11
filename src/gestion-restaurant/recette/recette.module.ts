import { Module } from '@nestjs/common';
import { RecetteController } from './recette.controller';
import { RecetteService } from './recette.service';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [RecetteController],
  providers: [RecetteService, ResponseService],
  exports: [RecetteService],
})
export class RecetteModule {}
