import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseInterceptors, UploadedFile, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { BoutiqueService } from './boutique.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { tenantMulterOptions } from 'src/common/helpers/tenant-file.helper';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResponseService } from 'src/services/response/response.service';
import { DataRequest } from 'src/interface/DataRequest';


@Controller('boutique')
export class BoutiqueController {
  constructor(private readonly boutiqueService: BoutiqueService, private responseService: ResponseService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', tenantMulterOptions('/logos')))
  async create(@Body() createBoutiqueDto: CreateBoutiqueDto, @UploadedFile() logo: Express.Multer.File): Promise<any> {
    const data = await this.boutiqueService.create(createBoutiqueDto, logo);
    return this.responseService.success('Enregistement effectuée avec succès', data);
  }

  @Get()
  async findAll(@Query('structure') structure?: string): Promise<DataRequest> {
    const data = structure
      ? await this.boutiqueService.findByStructure(structure)
      : await this.boutiqueService.findAll();
    return this.responseService.success('Liste des boutiques', data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('structure') structure?: string): Promise<DataRequest> {
    const data = await this.boutiqueService.findOne(+id, structure ? +structure : undefined);
    return this.responseService.success('Boutique trouvé', data);
  }

  @Patch(':id')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('logo', tenantMulterOptions('/logos')))
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateBoutiqueDto: UpdateBoutiqueDto,
    @UploadedFile() logo: Express.Multer.File,
    @Query('structure') structure?: string,
  ): Promise<DataRequest> {
    const user = (req as any).user;
    const profilCode: string = user?.profil?.code?.toLowerCase() ?? '';
    // Responsable_structure ne peut pas changer le type de boutique
    if (profilCode === 'responsable_structure') {
      delete (updateBoutiqueDto as any).type;
    }
    // structure peut venir du query param OU du body (cas super_admin)
    const bodyStructure = (updateBoutiqueDto as any).structure;
    const structureId = structure ? +structure : bodyStructure ? +bodyStructure : undefined;
    const data = await this.boutiqueService.update(+id, updateBoutiqueDto, logo, structureId);
    return this.responseService.success('Modification effectuée avec succès', data);
  }

  @Patch(':id/desactiver')
  async desactiver(
    @Param('id') id: string,
    @Query('structure') structure?: string,
    @Body('structure') bodyStructure?: string,
  ): Promise<DataRequest> {
    const structureId = structure ? +structure : bodyStructure ? +bodyStructure : undefined;
    const data = await this.boutiqueService.toggleActive(+id, false, structureId);
    return this.responseService.success('Boutique désactivée', data);
  }

  @Patch(':id/activer')
  async activer(
    @Param('id') id: string,
    @Query('structure') structure?: string,
    @Body('structure') bodyStructure?: string,
  ): Promise<DataRequest> {
    const structureId = structure ? +structure : bodyStructure ? +bodyStructure : undefined;
    const data = await this.boutiqueService.toggleActive(+id, true, structureId);
    return this.responseService.success('Boutique activée', data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boutiqueService.remove(+id);
  }
}
