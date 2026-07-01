import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConfig } from './entities/tenant-config.entity';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';
import { TenantController } from './tenant.controller';
import { ResponseService } from 'src/services/response/response.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TenantConfig])],
  providers: [TenantService, TenantContextService, ResponseService],
  controllers: [TenantController],
  exports: [TenantService, TenantContextService],
})
export class TenantModule {}
