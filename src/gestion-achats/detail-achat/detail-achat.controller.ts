import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DetailAchatService } from './detail-achat.service';
import { CreateDetailAchatDto } from './dto/create-detail-achat.dto';
import { UpdateDetailAchatDto } from './dto/update-detail-achat.dto';
import { Achat } from '../achat/entities/achat.entity';

@Controller('detail-achat')
export class DetailAchatController {
  constructor(private readonly detailAchatService: DetailAchatService) {}

  @Post()
  create(@Body() createDetailAchatDto: CreateDetailAchatDto) {
    return this.detailAchatService.create(createDetailAchatDto);
  }

  @Get()
  findAll() {
    return this.detailAchatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: Achat) {
    return this.detailAchatService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDetailAchatDto: UpdateDetailAchatDto) {
    return this.detailAchatService.update(+id, updateDetailAchatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detailAchatService.remove(+id);
  }
}
