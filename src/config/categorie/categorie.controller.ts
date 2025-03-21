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
  async findAll(@Res() response: Response,) {
    const data = await this.categorieService.findAll();
    return response.json({
      status: 'success',
      message: 'Liste des catégories',
      data: data
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const data = this.categorieService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategorieDto: UpdateCategorieDto) {
    return this.categorieService.update(+id, updateCategorieDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categorieService.remove(+id);
  }
}
