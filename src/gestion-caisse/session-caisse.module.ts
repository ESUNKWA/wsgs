import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionCaisse } from './entities/session-caisse.entity';
import { MouvementCaisse } from './entities/mouvement-caisse.entity';
import { SessionCaisseService } from './session-caisse.service';
import { SessionCaisseController } from './session-caisse.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [TypeOrmModule.forFeature([SessionCaisse, MouvementCaisse])],
  controllers: [SessionCaisseController],
  providers: [SessionCaisseService, ResponseService],
  exports: [SessionCaisseService],
})
export class SessionCaisseModule {}
