import { PartialType } from '@nestjs/swagger';
import { CreateDetailAchatDto } from './create-detail-achat.dto';

export class UpdateDetailAchatDto extends PartialType(CreateDetailAchatDto) {}
