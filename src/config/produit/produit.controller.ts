import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Produit } from './entities/produit.entity';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { Categorie } from '../categorie/entities/categorie.entity';

@Controller('produit')
export class ProduitController {
  constructor(private readonly produitService: ProduitService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createProduitDto: CreateProduitDto): Promise<DataRequest> {
    const data = await this.produitService.create(createProduitDto);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  @HttpCode(200)
  async findAll() {
    const data = await this.produitService.findAll();
    return this.responseService.success('Liste des produits', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.produitService.findOne(+id);
    return this.responseService.success('Produit trouvé', data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProduitDto: UpdateProduitDto) {
    const data = await this.produitService.update(+id, updateProduitDto);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(+id);
  }
}
