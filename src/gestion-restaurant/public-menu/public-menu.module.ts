import { Module } from '@nestjs/common';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';
import { EventsModule } from 'src/events/events.module';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TenantModule, EventsModule],
  controllers: [PublicMenuController],
  providers: [PublicMenuService],
})
export class PublicMenuModule {}
