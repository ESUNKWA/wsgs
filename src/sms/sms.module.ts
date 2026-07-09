import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsLog } from './entities/sms-log.entity';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { RapportJournalierService } from './rapport-journalier.service';
import { Abonnement } from 'src/abonnement/entities/abonnement.entity';
import { Structure } from 'src/gestion-boutiques/structure/entities/structure.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsLog, Abonnement, Structure]),
    TenantModule,
  ],
  controllers: [SmsController],
  providers: [SmsService, RapportJournalierService, ResponseService],
  exports: [SmsService],
})
export class SmsModule {}
