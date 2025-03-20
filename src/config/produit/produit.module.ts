import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';

@Module({
  controllers: [ProduitController],
  providers: [ProduitService],
})
export class ProduitModule {}
