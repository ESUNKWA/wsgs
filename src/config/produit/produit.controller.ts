import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseInterceptors, UploadedFile, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProduitService } from './produit.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { DataRequest } from 'src/interface/DataRequest';
import { ResponseService } from 'src/services/response/response.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { tenantMulterOptions } from 'src/common/helpers/tenant-file.helper';
import { importMulterOptions } from 'src/common/helpers/import-multer.config';


@Controller('produit')
export class ProduitController {
  constructor(private readonly produitService: ProduitService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image', tenantMulterOptions('/produits')))
  async create(@Body() createProduitDto: CreateProduitDto, @UploadedFile() image: Express.Multer.File): Promise<DataRequest> {
    const data = await this.produitService.create(createProduitDto, image);
    return this.responseService.success('Enregistrement effectué avec succès', data);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() query: { boutique: number; page?: number; limit?: number }): Promise<any> {
    const result = await this.produitService.findAll(query);
    return this.responseService.successPaginated('Liste des produits', result);
  }

  @Get('scan/:code')
  async scan(@Param('code') code: string, @Query('boutique') boutique: string): Promise<DataRequest> {
    const data = await this.produitService.findByCodeBarre(code, +boutique);
    return this.responseService.success('Produit trouvé', data);
  }

  @Get('catalogue-barcodes')
  async catalogueBarcodes(@Query('boutique') boutique: string, @Res() res: Response) {
    const buffer = await this.produitService.generateCatalogueCodeBarres(+boutique);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="catalogue-codes-barres.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/etiquette')
  async etiquette(
    @Param('id') id: string,
    @Query('copies') copies: string,
    @Res() res: Response,
  ) {
    const buffer = await this.produitService.generateEtiquette(+id, copies ? +copies : 1);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="etiquette-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DataRequest> {
    const data = await this.produitService.findOne(+id);
    return this.responseService.success('Produit trouvé', data);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', tenantMulterOptions('/produits')))
  async update(@Param('id') id: string, @Body() updateProduitDto: UpdateProduitDto, @UploadedFile() image: Express.Multer.File) {
    const data = await this.produitService.update(+id, updateProduitDto, image);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(+id);
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', importMulterOptions))
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('boutique') boutique: string,
  ): Promise<DataRequest> {
    const result = await this.produitService.importFromFile(file, +boutique);
    return this.responseService.success(
      `Import terminé : ${result.created} créé(s), ${result.skipped} ignoré(s)`,
      result,
    );
  }
}
