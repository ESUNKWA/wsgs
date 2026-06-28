import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { FondParModeDto } from './fond-par-mode.dto';

export class OuvrirCaisseDto {
  @IsNotEmpty({ message: 'La boutique est requise' })
  boutique!: number;

  @IsNotEmpty({ message: 'Le caissier est requis' })
  caissier!: number;

  @ValidateNested()
  @Type(() => FondParModeDto)
  fond_ouverture!: FondParModeDto;
}
