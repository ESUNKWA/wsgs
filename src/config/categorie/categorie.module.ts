import { Module } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CategorieController } from './categorie.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categorie } from './entities/categorie.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [ TypeOrmModule.forFeature([Categorie]) ],
  controllers: [CategorieController],
  providers: [CategorieService, ResponseService],
})
export class CategorieModule {}
