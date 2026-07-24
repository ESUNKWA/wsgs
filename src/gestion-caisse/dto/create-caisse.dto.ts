import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCaisseDto {
  @IsNotEmpty({ message: 'La boutique est requise' })
  boutique!: number;

  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(100)
  nom!: string;

  @IsNotEmpty({ message: 'Le code est requis' })
  @MaxLength(20)
  code!: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @MaxLength(150)
  emplacement?: string;
}

export class UpdateCaisseDto {
  @IsOptional()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @MaxLength(150)
  emplacement?: string;

  @IsOptional()
  statut?: 'ACTIVE' | 'INACTIVE';
}
