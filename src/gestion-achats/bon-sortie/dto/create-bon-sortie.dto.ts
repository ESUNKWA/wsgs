import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LigneBonSortieDto {
  @IsNotEmpty()
  @IsNumber()
  fourniture: number;

  @IsNotEmpty()
  @IsNumber()
  quantite: number;
}

export class CreateBonSortieDto {
  @IsNotEmpty({ message: 'La boutique source est requise' })
  boutique: number;

  @IsNotEmpty({ message: 'Le département destinataire est requis' })
  departement: number;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneBonSortieDto)
  lignes: LigneBonSortieDto[];
}
