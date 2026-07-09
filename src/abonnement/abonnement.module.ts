import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abonnement } from './entities/abonnement.entity';
import { PlanTarif } from './entities/plan-tarif.entity';
import { BoutiqueAbonnement } from './entities/boutique-abonnement.entity';
import { ConfigTarif } from './entities/config-tarif.entity';
import { AbonnementService } from './abonnement.service';
import { AbonnementController } from './abonnement.controller';
import { ResponseService } from 'src/services/response/response.service';
import { FraisSetup } from './entities/frais-setup.entity';
import { CategorieStructure } from './entities/categorie-structure.entity';
import { PlanTarifCategorie } from './entities/plan-tarif-categorie.entity';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { PdfModule } from 'src/documents/pdf/pdf.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Abonnement, PlanTarif, BoutiqueAbonnement, ConfigTarif, FraisSetup, CategorieStructure, PlanTarifCategorie, Structure]), PdfModule],
  providers: [AbonnementService, ResponseService],
  controllers: [AbonnementController],
  exports: [AbonnementService],
})
export class AbonnementModule {}
