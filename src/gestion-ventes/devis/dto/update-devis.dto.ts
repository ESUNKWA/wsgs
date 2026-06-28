import { PartialType } from '@nestjs/mapped-types';
import { CreateDevisDto } from './create-devis.dto';

export class UpdateDevisDto extends PartialType(CreateDevisDto) {}
