import { Module } from '@nestjs/common';
import { TableRestaurantController } from './table.controller';
import { TableRestaurantService } from './table.service';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  controllers: [TableRestaurantController],
  providers: [TableRestaurantService, ResponseService],
  exports: [TableRestaurantService],
})
export class TableRestaurantModule {}
