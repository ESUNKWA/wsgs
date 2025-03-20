import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProduitModule } from './config/produit/produit.module';

@Module({
  imports: [ProduitModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
