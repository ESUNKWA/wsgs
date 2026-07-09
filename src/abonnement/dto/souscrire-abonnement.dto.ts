import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PlanType } from '../entities/plan-tarif.entity';

export class SouscrireAbonnementDto {
  @IsNumber()
  structureId: number;

  @IsEnum(['1_mois', '3_mois', '6_mois', '1_an'])
  plan: PlanType;

  @IsOptional()
  @IsNumber()
  montant?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['montant', 'pourcentage'])
  remise_type?: 'montant' | 'pourcentage';

  @IsOptional()
  @IsNumber()
  @Min(0)
  remise_valeur?: number;
}
