import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/common/helpers/multer.config';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('produit')
export class ProduitController {
  constructor(private readonly produitService: ProduitService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image', multerOptions('/produits'))) 
  async create(@Body() createProduitDto: CreateProduitDto, @UploadedFile() image: Express.Multer.File): Promise<DataRequest> {
    
    const data = await this.produitService.create(createProduitDto, image);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() query: {boutique: number}): Promise<DataRequest> {
    const data = await this.produitService.findAll(query);
    return this.responseService.success('Liste des produits', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.produitService.findOne(+id);
    return this.responseService.success('Produit trouvé', data);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', multerOptions('/produits')))
  async update(@Param('id') id: string, @Body() updateProduitDto: UpdateProduitDto, @UploadedFile() image: Express.Multer.File) {
    const data = await this.produitService.update(+id, updateProduitDto, image);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(+id);
  }
}
