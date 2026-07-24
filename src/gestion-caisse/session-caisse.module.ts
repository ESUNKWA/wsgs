import { Module } from '@nestjs/common';
import { SessionCaisseService } from './session-caisse.service';
import { SessionCaisseController } from './session-caisse.controller';
import { CaissesService } from './caisses.service';
import { CaissesController } from './caisses.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [SessionCaisseController, CaissesController],
  providers: [SessionCaisseService, CaissesService, ResponseService],
  exports: [SessionCaisseService, CaissesService],
})
export class SessionCaisseModule {}
