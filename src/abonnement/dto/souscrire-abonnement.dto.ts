import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PlanType } from '../entities/plan-tarif.entity';

export class SouscrireAbonnementDto {
  @IsNumber()
  structureId: number;

  @IsEnum(['3_mois', '6_mois', '1_an'])
  plan: PlanType;

  @IsOptional()
  @IsNumber()
  montant?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
