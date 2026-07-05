import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscriptionService } from './inscription.service';
import { InscriptionController } from './inscription.controller';
import { DemandeInscription } from './entities/demande-inscription.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeInscription]),
    TenantModule,
  ],
  controllers: [InscriptionController],
  providers: [InscriptionService],
})
export class InscriptionModule {}
