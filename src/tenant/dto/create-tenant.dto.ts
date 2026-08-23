import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Les paramètres de connexion à la base (hôte, port, identifiants) sont résolus
 * exclusivement côté serveur (cf. TenantService.resolveTenantDbConfig), à partir du
 * .env backend — jamais saisis ni transmis par le frontend. Seul le nom de la base
 * tenant reste choisi via l'interface.
 */
export class CreateTenantDto {
  @IsInt()
  @Min(1)
  structureId: number;

  @IsString()
  @IsNotEmpty()
  database: string;

  // ─── Admin initial de la structure (optionnel) ─────────────────────────────
  @IsString()
  @IsOptional()
  adminNom?: string;

  @IsString()
  @IsOptional()
  adminPrenoms?: string;

  @IsString()
  @IsOptional()
  adminTelephone?: string;

  @IsString()
  @IsOptional()
  adminEmail?: string;

  @IsString()
  @IsOptional()
  adminPassword?: string;
}
