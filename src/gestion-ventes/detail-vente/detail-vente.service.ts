import { Injectable } from '@nestjs/common';
import { CreateDetailVenteDto } from './dto/create-detail-vente.dto';
import { UpdateDetailVenteDto } from './dto/update-detail-vente.dto';

@Injectable()
export class DetailVenteService {
  create(createDetailVenteDto: CreateDetailVenteDto) {
    return 'This action adds a new detailVente';
  }

  findAll() {
    return `This action returns all detailVente`;
  }

  findOne(id: number) {
    return `This action returns a #${id} detailVente`;
  }

  update(id: number, updateDetailVenteDto: UpdateDetailVenteDto) {
    return `This action updates a #${id} detailVente`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailVente`;
  }
}
