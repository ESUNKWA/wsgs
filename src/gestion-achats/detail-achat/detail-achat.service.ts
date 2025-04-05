import { Injectable } from '@nestjs/common';
import { CreateDetailAchatDto } from './dto/create-detail-achat.dto';
import { UpdateDetailAchatDto } from './dto/update-detail-achat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DetailAchat } from './entities/detail-achat.entity';
import { Repository } from 'typeorm';
import { Achat } from '../achat/entities/achat.entity';

@Injectable()
export class DetailAchatService {

  constructor( @InjectRepository(DetailAchat) private detailAchatRepository: Repository<DetailAchat> ){}

  create(createDetailAchatDto: CreateDetailAchatDto) {
    return 'This action adds a new detailAchat';
  }

  findAll() {
    return `This action returns all detailAchat`;
  }

  async findOne(idAchat: Achat) {
    const data = await this.detailAchatRepository.findOne({where: {achat: idAchat}});
    return data;
  }

  update(id: number, updateDetailAchatDto: UpdateDetailAchatDto) {
    return `This action updates a #${id} detailAchat`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailAchat`;
  }
}
