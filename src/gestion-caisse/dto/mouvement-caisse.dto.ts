import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MouvementCaisseDto {
  @IsIn(['entree', 'sortie'], { message: 'Le type doit être "entree" ou "sortie"' })
  type: 'entree' | 'sortie';

  @IsNotEmpty({ message: 'Le motif est requis' })
  motif: string;

  @IsNumber()
  @Min(1)
  montant: number;

  @IsOptional()
  @IsString()
  @IsIn(['espece', 'mobile_money', 'carte', 'credit', 'mixte'])
  mode_paiement?: string;

  @IsOptional()
  caissier?: number;
}
