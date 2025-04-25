import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class ClientService {

  constructor(@InjectRepository(Client) private clientRepository: Repository<Client>){}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const data = await this.clientRepository.save(createClientDto);
    return data;
  }

  async findAll(): Promise<Client[]> {
    const data = await this.clientRepository.find();
    return data;
  }

  findOne(id: number) {
    return `This action returns a #${id} client`;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const data = await this.clientRepository.preload({id, ...updateClientDto});
    if(!data){
      throw new NotFoundException('Client non trouvé');
    }
    return await this.clientRepository.save(data);
  }

  remove(id: number) {
    return `This action removes a #${id} client`;
  }
}
