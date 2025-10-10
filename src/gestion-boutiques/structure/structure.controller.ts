import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors, HttpCode, UseGuards } from '@nestjs/common';
import { StructureService } from './structure.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { ResponseService } from 'src/services/response/response.service';
import { DataRequest } from 'src/interface/DataRequest';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/common/helpers/multer.config';
import { AuthGuard } from '@nestjs/passport';

@Controller('structure')
@UseGuards(AuthGuard('jwt'))
export class StructureController {
  constructor(private readonly structureService: StructureService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', multerOptions('/logos')))
  async create(@Body() createStructureDto: CreateStructureDto, @UploadedFile() logo: Express.Multer.File): Promise<DataRequest> {
    const data = await this.structureService.create(createStructureDto, logo);
    return this.responseService.success('Enregistement effectuée avec succès', data);
  }

  @Get()
  async findAll() {
    const data = await this.structureService.findAll();
    return this.responseService.success('Liste des structures', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.structureService.findOne(+id);
    return this.responseService.success('Structure trouvée', data);

  }

  @Patch(':id')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', multerOptions('/logos')))
  async update(@Param('id') id: string, @Body() updateStructureDto: UpdateStructureDto, @UploadedFile() logo?: Express.Multer.File) {
    const data = await this.structureService.update(+id, updateStructureDto, logo);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.structureService.remove(+id);
  }
}
