import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './entities/produit.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports:[TypeOrmModule.forFeature([Produit])],
  controllers: [ProduitController],
  providers: [ProduitService, ResponseService],
})
export class ProduitModule {}
