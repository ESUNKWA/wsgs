import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProduitModule } from './config/produit/produit.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './config/produit/entities/produit.entity';
import { CategorieModule } from './config/categorie/categorie.module';
import { Categorie } from './config/categorie/entities/categorie.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'gstock_db',
      entities: [Produit, Categorie],
      synchronize: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ProduitModule,
    CategorieModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
