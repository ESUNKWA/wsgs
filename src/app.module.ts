import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProduitModule } from './config/produit/produit.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'gstock_db',
      entities: [],
      synchronize: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ProduitModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
