import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { BoutiqueService } from './boutique.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { multerOptions } from 'src/common/helpers/multer.config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResponseService } from 'src/services/response/response.service';
import { DataRequest } from 'src/interface/DataRequest';
import { AuthGuard } from '@nestjs/passport';


@Controller('boutique')
export class BoutiqueController {
  constructor(private readonly boutiqueService: BoutiqueService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', multerOptions('/logos')))
  async create(@Body() createBoutiqueDto: CreateBoutiqueDto, @UploadedFile() logo: Express.Multer.File): Promise<any> {
    const data = await this.boutiqueService.create(createBoutiqueDto, logo);
    return this.responseService.success('Enregistement effectuée avec succès', data);
  }

  @Get()
  async findAll(): Promise<DataRequest> {
    const data = await this.boutiqueService.findAll();
    return this.responseService.success('Liste des boutiques', data);
  }

  @Get()
  async findByStructure(@Query('structure') structure: string): Promise<DataRequest> {
    const data = await this.boutiqueService.findByStructure(structure);
    return this.responseService.success('Liste des boutiques', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.boutiqueService.findOne(+id);
    return this.responseService.success('Boutique trouvé', data);
  }

  @Patch(':id')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', multerOptions('/logos')))
  async update(@Param('id') id: string, @Body() updateBoutiqueDto: UpdateBoutiqueDto, @UploadedFile() logo: Express.Multer.File): Promise<DataRequest> {
    const data = await this.boutiqueService.update(+id, updateBoutiqueDto, logo);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boutiqueService.remove(+id);
  }
}
