import { PartialType } from '@nestjs/mapped-types';
import { CreateCommandeClientDto } from './create-commande-client.dto';

export class UpdateCommandeClientDto extends PartialType(CreateCommandeClientDto) {}
