import { Module } from '@nestjs/common';
import { BoutiqueService } from './boutique.service';
import { BoutiqueController } from './boutique.controller';
import { ResponseService } from 'src/services/response/response.service';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [BoutiqueController],
  providers: [BoutiqueService, ResponseService],
})
export class BoutiqueModule {}
