import { Module } from '@nestjs/common';
import { BoutiqueService } from './boutique.service';
import { BoutiqueController } from './boutique.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boutique } from './entities/boutique.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports:[TypeOrmModule.forFeature([Boutique])],
  controllers: [BoutiqueController],
  providers: [BoutiqueService, ResponseService],
})
export class BoutiqueModule {}
