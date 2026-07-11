import { Module } from '@nestjs/common';
import { MenuJourController } from './menu-jour.controller';
import { MenuJourService } from './menu-jour.service';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [MenuJourController],
  providers: [MenuJourService, ResponseService],
  exports: [MenuJourService],
})
export class MenuJourModule {}
