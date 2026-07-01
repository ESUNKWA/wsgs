import { Module } from '@nestjs/common';
import { SessionCaisseService } from './session-caisse.service';
import { SessionCaisseController } from './session-caisse.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [SessionCaisseController],
  providers: [SessionCaisseService, ResponseService],
  exports: [SessionCaisseService],
})
export class SessionCaisseModule {}
