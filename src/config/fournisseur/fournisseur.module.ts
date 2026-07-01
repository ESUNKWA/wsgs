import { Module } from '@nestjs/common';
import { FournisseurService } from './fournisseur.service';
import { FournisseurController } from './fournisseur.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [FournisseurController],
  providers: [FournisseurService, ResponseService],
})
export class FournisseurModule {}
