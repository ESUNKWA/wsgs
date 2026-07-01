import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTenantDto {
  @IsInt()
  @Min(1)
  structureId: number;

  @IsString()
  @IsOptional()
  host?: string;

  @IsInt()
  @IsOptional()
  port?: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

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
