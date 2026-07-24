import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { FondParModeDto } from './fond-par-mode.dto';

export class OuvrirCaisseDto {
  @IsNotEmpty({ message: 'La boutique est requise' })
  boutique!: number;

  @IsNotEmpty({ message: 'Le caissier est requis' })
  caissier!: string;

  @IsOptional()
  caisse_id?: number;

  @ValidateNested()
  @Type(() => FondParModeDto)
  fond_ouverture!: FondParModeDto;
}
