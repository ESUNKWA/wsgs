import { Controller, Get, Post, Body, Patch, Param, Delete, Res, HttpCode, UseGuards } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { ResponseService } from 'src/services/response/response.service';
import { DataRequest } from 'src/interface/DataRequest';
import { AuthGuard } from '@nestjs/passport';

@Controller('categorie')
@UseGuards(AuthGuard('jwt'))
export class CategorieController {
  constructor(private readonly categorieService: CategorieService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  
  async create(@Body() createCategorie: CreateCategorieDto): Promise<DataRequest> {
    const data = await this.categorieService.create(createCategorie);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  @HttpCode(200)
  async findAll(): Promise<DataRequest> {
    const data = await this.categorieService.findAll();
    return this.responseService.success('Liste des catégories', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.categorieService.findOne(+id);
    return this.responseService.success('Catégorie trouvé', data);
  }

   @Patch(':id')
   async update(@Param('id') id: string, @Body() updateCategorieDto: UpdateCategorieDto): Promise<DataRequest> {
    const data = await this.categorieService.update(+id, updateCategorieDto);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categorieService.remove(+id);
  }
}
