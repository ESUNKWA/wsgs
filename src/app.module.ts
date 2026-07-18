import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProduitModule } from './config/produit/produit.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategorieModule } from './config/categorie/categorie.module';
import { ResponseService } from './services/response/response.service';
import { FournisseurModule } from './config/fournisseur/fournisseur.module';
import { AchatModule } from './gestion-achats/achat/achat.module';
import { HistoriqueStockModule } from './gestion-achats/historique-stock/historique-stock.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UtilisateursModule } from './gestion-utilisateurs/utilisateurs/utilisateurs.module';
import { ProfilsModule } from './gestion-utilisateurs/profils/profils.module';
import { AuthenticationModule } from './gestion-utilisateurs/authentication/authentication.module';
import { StructureModule } from './gestion-boutiques/structure/structure.module';
import { BoutiqueModule } from './gestion-boutiques/boutique/boutique.module';
import { VenteModule } from './gestion-ventes/vente/vente.module';
import { DetailVenteModule } from './gestion-ventes/detail-vente/detail-vente.module';
import { ClientModule } from './gestion-ventes/client/client.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OllamaModule } from './ollama/ollama.module';
import { DevisModule } from './gestion-ventes/devis/devis.module';
import { CommandeFournisseurModule } from './gestion-achats/commande-fournisseur/commande-fournisseur.module';
import { CommandeClientModule } from './gestion-ventes/commande-client/commande-client.module';
import { SessionCaisseModule } from './gestion-caisse/session-caisse.module';
import * as path from 'path';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './gestion-utilisateurs/authentication/auth/jwt-auth.guard'
import { PdfModule } from './documents/pdf/pdf.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { PrevisionModule } from './prevision/prevision.module';
import { AiModule } from './ai/ai.module';
import { Utilisateur } from './gestion-utilisateurs/utilisateurs/entities/utilisateur.entity';
import { Structure } from './gestion-boutiques/structure/entities/structure.entity';
import { Profil } from './gestion-utilisateurs/profils/entities/profil.entity';
import { TenantConfig } from './tenant/entities/tenant-config.entity';
import { Abonnement } from './abonnement/entities/abonnement.entity';
import { PlanTarif } from './abonnement/entities/plan-tarif.entity';
import { BoutiqueAbonnement } from './abonnement/entities/boutique-abonnement.entity';
import { ConfigTarif } from './abonnement/entities/config-tarif.entity';
import { FraisSetup } from './abonnement/entities/frais-setup.entity';
import { CategorieStructure } from './abonnement/entities/categorie-structure.entity';
import { PlanTarifCategorie } from './abonnement/entities/plan-tarif-categorie.entity';
import { AbonnementModule } from './abonnement/abonnement.module';
import { AbonnementGuard } from './abonnement/guards/abonnement.guard';
import { RetourVenteModule } from './gestion-ventes/retour-vente/retour-vente.module';
import { EventsModule } from './events/events.module';
import { InscriptionModule } from './inscription/inscription.module';
import { DemandeInscription } from './inscription/entities/demande-inscription.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SmsModule } from './sms/sms.module';
import { TableRestaurantModule } from './gestion-restaurant/table/table.module';
import { RecetteModule } from './gestion-restaurant/recette/recette.module';
import { CommandeTableModule } from './gestion-restaurant/commande-table/commande-table.module';
import { MenuJourModule } from './gestion-restaurant/menu-jour/menu-jour.module';
import { PublicMenuModule } from './gestion-restaurant/public-menu/public-menu.module';
import { SmsLog } from './sms/entities/sms-log.entity';
import { TransfertStockModule } from './gestion-achats/transfert-stock/transfert-stock.module';
import { BonSortieModule } from './gestion-achats/bon-sortie/bon-sortie.module';
import { ModuleStructure } from './modules/entities/module-structure.entity';
import { ModuleStructureModule } from './modules/module-structure.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'public'), // Remplace par le chemin correct
      serveRoot: '/', // Cette URL sera utilisée pour accéder aux fichiers
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB,
      entities: [Utilisateur, Profil, Structure, TenantConfig, Abonnement, PlanTarif, BoutiqueAbonnement, ConfigTarif, FraisSetup, CategorieStructure, PlanTarifCategorie, DemandeInscription, SmsLog, ModuleStructure],
      synchronize: true,
    }),
    ConfigModule.forRoot(), 
    ProduitModule,
    CategorieModule,
    FournisseurModule,
    AchatModule,
    HistoriqueStockModule,
    UtilisateursModule,
    ProfilsModule,
    AuthenticationModule,
    StructureModule,
    BoutiqueModule,
    VenteModule,
    DetailVenteModule,
    ClientModule,
    DashboardModule,
    OllamaModule,
    PdfModule,
    DevisModule,
    CommandeFournisseurModule,
    CommandeClientModule,
    SessionCaisseModule,
    TenantModule,
    PrevisionModule,
    AiModule,
    AbonnementModule,
    RetourVenteModule,
    EventsModule,
    InscriptionModule,
    ScheduleModule.forRoot(),
    SmsModule,
    TableRestaurantModule,
    RecetteModule,
    CommandeTableModule,
    MenuJourModule,
    PublicMenuModule,
    TransfertStockModule,
    BonSortieModule,
    ModuleStructureModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AbonnementGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
