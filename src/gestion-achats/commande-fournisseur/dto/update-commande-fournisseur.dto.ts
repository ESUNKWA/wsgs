import { PartialType } from '@nestjs/mapped-types';
import { CreateCommandeFournisseurDto } from './create-commande-fournisseur.dto';

export class UpdateCommandeFournisseurDto extends PartialType(CreateCommandeFournisseurDto) {}
