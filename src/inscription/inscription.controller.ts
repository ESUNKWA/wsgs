import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { SoumettreInscriptionDto } from './dto/soumettre-inscription.dto';
import { ValiderInscriptionDto } from './dto/valider-inscription.dto';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';

@Controller('inscription')
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  /** Formulaire public — aucune authentification requise */
  @Public()
  @Post()
  soumettre(@Body() dto: SoumettreInscriptionDto) {
    return this.inscriptionService.soumettre(dto);
  }

  /** Liste des demandes — super_admin uniquement */
  @Get()
  findAll(@Query('statut') statut?: string) {
    return this.inscriptionService.findAll(statut);
  }

  /** Détail d'une demande */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inscriptionService.findOne(+id);
  }

  /** Valider et tout créer — super_admin */
  @Post(':id/valider')
  valider(@Param('id') id: string, @Body() dbDto: ValiderInscriptionDto) {
    return this.inscriptionService.valider(+id, dbDto);
  }

  /** Rejeter une demande */
  @Post(':id/rejeter')
  rejeter(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.inscriptionService.rejeter(+id, notes);
  }
}
