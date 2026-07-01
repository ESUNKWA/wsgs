import { Module } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CategorieController } from './categorie.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [CategorieController],
  providers: [CategorieService, ResponseService],
})
export class CategorieModule {}
