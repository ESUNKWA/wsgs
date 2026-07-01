import { Module } from '@nestjs/common';
import { PrevisionService } from './prevision.service';
import { PrevisionController } from './prevision.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [PrevisionController],
  providers: [PrevisionService, ResponseService],
})
export class PrevisionModule {}
