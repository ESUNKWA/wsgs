import { PartialType } from '@nestjs/swagger';
import { CreateVenteDto } from './create-vente.dto';

export class UpdateVenteDto extends PartialType(CreateVenteDto) {
}
