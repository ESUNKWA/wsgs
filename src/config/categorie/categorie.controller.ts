import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { Response } from 'express';

@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  @Post()
  async create(@Res() response: Response,  @Body() createCategorieDto: CreateCategorieDto) {
    const insertData = await this.categorieService.create(createCategorieDto);
    return response.json({
      status: 'success',
      message: 'Enregistrement effectué avec succès',
      data: insertData
    });
  }

  @Get()
  async findAll(@Res() response: Response) {
    const data = await this.categorieService.findAll();
    return response.json({
      status: 'success',
      message: 'Liste des catégories',
      data: data
    });
  }

  @Get(':id')
  async findOne(@Res() response: Response, @Param('id') id: string) {
    const data = await this.categorieService.findOne(+id);
    return response.json({
      status: 'success',
      message: 'catégorie',
      data: data
    });
  }

   @Patch(':id')
   async update(@Res() response: Response, @Param('id') id: string, @Body() updateCategorieDto: UpdateCategorieDto) {
    const data = await this.categorieService.update(+id, updateCategorieDto);
    return response.json({
      status: 'success',
      message: 'Modification effectuée avec succès',
      data: data
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categorieService.remove(+id);
  }
}
