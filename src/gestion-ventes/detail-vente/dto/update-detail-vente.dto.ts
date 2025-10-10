import { PartialType } from '@nestjs/swagger';
import { CreateDetailVenteDto } from './create-detail-vente.dto';

export class UpdateDetailVenteDto extends PartialType(CreateDetailVenteDto) {}
