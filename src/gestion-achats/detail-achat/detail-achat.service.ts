import { Injectable } from '@nestjs/common';
import { CreateDetailAchatDto } from './dto/create-detail-achat.dto';
import { UpdateDetailAchatDto } from './dto/update-detail-achat.dto';

@Injectable()
export class DetailAchatService {
  create(createDetailAchatDto: CreateDetailAchatDto) {
    return 'This action adds a new detailAchat';
  }

  findAll() {
    return `This action returns all detailAchat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} detailAchat`;
  }

  update(id: number, updateDetailAchatDto: UpdateDetailAchatDto) {
    return `This action updates a #${id} detailAchat`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailAchat`;
  }
}
