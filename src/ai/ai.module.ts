import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [AiController],
  providers: [AiService, ResponseService],
})
export class AiModule {}
