import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProduitModule } from './config/produit/produit.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './config/produit/entities/produit.entity';
import { CategorieModule } from './config/categorie/categorie.module';
import { Categorie } from './config/categorie/entities/categorie.entity';
import { ResponseService } from './services/response/response.service';
import { FournisseurModule } from './config/fournisseur/fournisseur.module';
import { Fournisseur } from './config/fournisseur/entities/fournisseur.entity';
import { Achat } from './gestion-achats/achat/entities/achat.entity';
import { AchatModule } from './gestion-achats/achat/achat.module';
import { DetailAchat } from './gestion-achats/detail-achat/entities/detail-achat.entity';
import { HistoriqueStockModule } from './gestion-achats/historique-stock/historique-stock.module';

@Module({
  imports: [
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
    ProduitModule,
    CategorieModule,
    FournisseurModule,
    AchatModule,
    HistoriqueStockModule
  ],
  controllers: [AppController],
  providers: [AppService, ResponseService],
})
export class AppModule {}
