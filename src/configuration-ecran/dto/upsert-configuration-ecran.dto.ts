import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const ECRANS = [
  'dashboard', 'pos', 'ekwatech',
  'restaurant-admin', 'restaurant-serveur', 'restaurant-caissier', 'restaurant-cuisine',
] as const;

export type EcranCible = typeof ECRANS[number];

export class UpsertConfigurationEcranDto {
  @IsOptional()
  @IsString()
  boutique_type?: string | null;

  @IsNotEmpty()
  @IsString()
  profil_code: string;

  @IsNotEmpty()
  @IsIn(ECRANS)
  ecran_cible: EcranCible;
}
