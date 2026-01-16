import { Module } from '@nestjs/common';
import { ProfilsService } from './profils.service';
import { ProfilsController } from './profils.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profil } from './entities/profil.entity';
import { ResponseService } from 'src/services/response/response.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profil])],
  controllers: [ProfilsController],
  providers: [ProfilsService, ResponseService]
})
export class ProfilsModule {}
