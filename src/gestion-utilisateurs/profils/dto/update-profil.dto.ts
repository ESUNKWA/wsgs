import { PartialType } from '@nestjs/swagger';
import { CreateProfilDto } from './create-profil.dto';

export class UpdateProfilDto extends PartialType(CreateProfilDto) {}
