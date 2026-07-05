import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class SoumettreInscriptionDto {
  // ── Structure ──────────────────────────────────────────────────────────────
  @IsString() @IsNotEmpty()
  structure_nom: string;

  @IsString() @IsNotEmpty()
  structure_telephone: string;

  @ValidateIf(o => !!o.structure_email)
  @IsEmail()
  @IsOptional()
  structure_email?: string;

  @IsString() @IsOptional()
  structure_situation_geo?: string;

  // ── Boutique ───────────────────────────────────────────────────────────────
  @IsString() @IsNotEmpty()
  boutique_nom: string;

  @IsString() @IsOptional()
  boutique_situation_geo?: string;

  // ── Responsable ────────────────────────────────────────────────────────────
  @IsString() @IsNotEmpty()
  responsable_nom: string;

  @IsString() @IsOptional()
  responsable_prenoms?: string;

  @IsString() @IsNotEmpty()
  responsable_telephone: string;

  @ValidateIf(o => !!o.responsable_email)
  @IsEmail()
  @IsOptional()
  responsable_email?: string;

  @IsString() @IsNotEmpty() @MinLength(6)
  responsable_password: string;
}
