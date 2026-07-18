import { Module } from '@nestjs/common';
import { BonSortieService } from './bon-sortie.service';
import { BonSortieController } from './bon-sortie.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [BonSortieController],
  providers: [BonSortieService, ResponseService],
  exports: [BonSortieService],
})
export class BonSortieModule {}
