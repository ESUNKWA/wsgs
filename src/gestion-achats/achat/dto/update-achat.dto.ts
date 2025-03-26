import { PartialType } from '@nestjs/swagger';
import { CreateAchatDto } from './create-achat.dto';

export class UpdateAchatDto extends PartialType(CreateAchatDto) {}
