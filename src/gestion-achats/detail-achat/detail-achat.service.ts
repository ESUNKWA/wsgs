import { Injectable } from '@nestjs/common';
import { CreateDetailAchatDto } from './dto/create-detail-achat.dto';
import { UpdateDetailAchatDto } from './dto/update-detail-achat.dto';
import { DetailAchat } from './entities/detail-achat.entity';
import { Achat } from '../achat/entities/achat.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class DetailAchatService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get detailAchatRepository() {
    return this.tenantContext.getDataSource().getRepository(DetailAchat);
  }

  create(createDetailAchatDto: CreateDetailAchatDto) {
    return 'This action adds a new detailAchat';
  }

  findAll() {
    return `This action returns all detailAchat`;
  }

  async findOne(idAchat: Achat) {
    return await this.detailAchatRepository.findOne({ where: { achat: idAchat } });
  }

  update(id: number, updateDetailAchatDto: UpdateDetailAchatDto) {
    return `This action updates a #${id} detailAchat`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailAchat`;
  }
}
