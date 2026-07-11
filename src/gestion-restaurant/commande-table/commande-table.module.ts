import { Module } from '@nestjs/common';
import { CommandeTableController } from './commande-table.controller';
import { CommandeTableService } from './commande-table.service';
import { ResponseService } from 'src/services/response/response.service';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [CommandeTableController],
  providers: [CommandeTableService, ResponseService],
  exports: [CommandeTableService],
})
export class CommandeTableModule {}
