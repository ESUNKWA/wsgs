import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationEcran } from './entities/configuration-ecran.entity';
import { ConfigurationEcranService } from './configuration-ecran.service';
import { ConfigurationEcranController } from './configuration-ecran.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigurationEcran])],
  controllers: [ConfigurationEcranController],
  providers: [ConfigurationEcranService],
  exports: [ConfigurationEcranService],
})
export class ConfigurationEcranModule {}
