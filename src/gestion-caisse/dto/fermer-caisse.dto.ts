import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { FondParModeDto } from './fond-par-mode.dto';

export class FermerCaisseDto {
  @ValidateNested()
  @Type(() => FondParModeDto)
  fond_fermeture!: FondParModeDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
