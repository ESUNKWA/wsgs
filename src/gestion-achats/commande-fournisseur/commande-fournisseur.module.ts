import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandeFournisseurController } from './commande-fournisseur.controller';
import { CommandeFournisseurService } from './commande-fournisseur.service';
import { CommandeFournisseur } from './entities/commande-fournisseur.entity';
import { DetailCommandeFournisseur } from './entities/detail-commande-fournisseur.entity';
import { ResponseService } from 'src/services/response/response.service';
import { AchatModule } from '../achat/achat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommandeFournisseur, DetailCommandeFournisseur]),
    AchatModule,
  ],
  controllers: [CommandeFournisseurController],
  providers: [CommandeFournisseurService, ResponseService],
  exports: [CommandeFournisseurService],
})
export class CommandeFournisseurModule {}
