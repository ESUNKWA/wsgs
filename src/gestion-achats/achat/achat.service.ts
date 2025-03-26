import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { Repository } from 'typeorm';
import { Achat } from './entities/achat.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AchatService {

  constructor( @InjectRepository(Achat) private achatRepositorie: Repository<Achat> ){}

  async create(createAchatDto: CreateAchatDto): Promise<Achat> {
    try {
      return await this.achatRepositorie.save(createAchatDto);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
    
  }

  async findAll(): Promise<Achat[]>  {
    return await this.achatRepositorie.find();
  }

  async findOne(id: number): Promise<Achat> {
    const achat = await this.achatRepositorie.findOne({where: {id: id}});
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return achat;
  }

  async update(id: number, updateAchatDto: UpdateAchatDto): Promise<Achat> {
    const achat = await this.achatRepositorie.preload({id, ...updateAchatDto});
    if(!achat){
      throw new NotFoundException('Achat inexistant');
    }
    return await this.achatRepositorie.save(achat);
  }

  remove(id: number) {
    return `This action removes a #${id} achat`;
  }
}
