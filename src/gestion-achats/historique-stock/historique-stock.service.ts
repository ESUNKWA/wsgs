import { Injectable } from '@nestjs/common';
import { CreateHistoriqueStockDto } from './dto/create-historique-stock.dto';
import { UpdateHistoriqueStockDto } from './dto/update-historique-stock.dto';

@Injectable()
export class HistoriqueStockService {
  create(createHistoriqueStockDto: CreateHistoriqueStockDto) {
    return 'This action adds a new historiqueStock';
  }

  findAll() {
    return `This action returns all historiqueStock`;
  }

  findOne(id: number) {
    return `This action returns a #${id} historiqueStock`;
  }

  update(id: number, updateHistoriqueStockDto: UpdateHistoriqueStockDto) {
    return `This action updates a #${id} historiqueStock`;
  }

  remove(id: number) {
    return `This action removes a #${id} historiqueStock`;
  }
}
