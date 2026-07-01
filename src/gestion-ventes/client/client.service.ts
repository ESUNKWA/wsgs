import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class ClientService {

  constructor(private readonly tenantContext: TenantContextService) {}

  private get clientRepository() {
    return this.tenantContext.getDataSource().getRepository(Client);
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    return await this.clientRepository.save(createClientDto);
  }

  async findAll(query?: { boutique?: number; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.clientRepository.findAndCount({
      order: { nom: 'ASC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  findOne(id: number) {
    return `This action returns a #${id} client`;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const data = await this.clientRepository.preload({ id, ...updateClientDto });
    if (!data) throw new NotFoundException('Client non trouvé');
    return await this.clientRepository.save(data);
  }

  remove(id: number) {
    return `This action removes a #${id} client`;
  }
}
