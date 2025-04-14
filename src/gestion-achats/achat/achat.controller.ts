import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AchatService } from './achat.service';
import { CreateAchatDto } from './dto/create-achat.dto';
import { UpdateAchatDto } from './dto/update-achat.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('achat')
export class AchatController {
  constructor(private readonly achatService: AchatService, private responseService: ResponseService) {}

  @Post()
  async create(@Body() createAchatDto: CreateAchatDto): Promise<DataRequest> {
    const data =  await this.achatService.create(createAchatDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);

  }

  @Get()
  async findAll(@Query() query: {boutique: number}): Promise<DataRequest> {
    const data = await this.achatService.findAll(query);
    return this.responseService.success('Liste des achat', data);

  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.achatService.findOne(+id);
    return this.responseService.success('Achat trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAchatDto: UpdateAchatDto): Promise<DataRequest> {
    const achat = await this.achatService.update(+id, updateAchatDto);
    return this.responseService.success('Modification effectuée avec succès', achat);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.achatService.remove(+id);
  }
}
