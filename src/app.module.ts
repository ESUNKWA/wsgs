import { Module } from '@nestjs/common';
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
import * as path from 'path';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './gestion-utilisateurs/authentication/auth/jwt-auth.guard'
import { PdfModule } from './documents/pdf/pdf.module';

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
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
    PdfModule
  ],
  controllers: [AppController],
  providers: [AppService, ResponseService, {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    }],
})
export class AppModule {}
