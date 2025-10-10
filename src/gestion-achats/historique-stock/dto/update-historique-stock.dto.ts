import { PartialType } from '@nestjs/swagger';
import { CreateHistoriqueStockDto } from './create-historique-stock.dto';

export class UpdateHistoriqueStockDto extends PartialType(CreateHistoriqueStockDto) {}
