import { IsNumber, IsOptional, Min } from 'class-validator';

export class FondParModeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  espece?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mobile_money?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carte?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mixte?: number;
}
