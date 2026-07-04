import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DetailRetourVenteDto {
  @IsInt()
  produit_id: number;

  @IsInt()
  @Min(1)
  quantite_retournee: number;
}

export class CreateRetourVenteDto {
  @Type(() => Number)
  @IsInt()
  vente_id: number;

  @Type(() => Number)
  @IsInt()
  boutique: number;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  user?: string; // téléphone du caissier

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailRetourVenteDto)
  details: DetailRetourVenteDto[];
}
