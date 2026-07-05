import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ValiderInscriptionDto {
  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsString() @IsNotEmpty()
  database: string;

  @IsString() @IsOptional()
  host?: string;

  @IsInt() @IsOptional()
  port?: number;
}
