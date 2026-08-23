import { IsNotEmpty, IsString } from 'class-validator';

/** Hôte/port/identifiants viennent du .env backend — seul le nom de la base est saisi. */
export class ValiderInscriptionDto {
  @IsString()
  @IsNotEmpty()
  database: string;
}
