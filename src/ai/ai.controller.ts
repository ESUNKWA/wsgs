import { Controller, Get, Post, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiService } from './ai.service';
import { ResponseService } from 'src/services/response/response.service';

const MIMETYPES_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

const imageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (MIMETYPES_IMAGES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG ou WEBP'), false);
    }
  },
};

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /ai/prix-suggere?produit=42&boutique=1
   *
   * Analyse les habitudes de marge de la boutique et la vélocité de vente
   * du produit pour proposer un prix optimal.
   */
  @Get('prix-suggere')
  async getPrixSuggere(
    @Query('produit') produit: string,
    @Query('boutique') boutique: string,
  ) {
    const data = await this.aiService.getPrixSuggere(+produit, +boutique);
    return this.responseService.success('Recommandation de prix', data);
  }

  /**
   * GET /ai/resume-journalier?boutique=1
   *
   * Résumé des performances du jour : ventes, CA, meilleure vente,
   * stock en alerte — comparé à la veille.
   */
  @Get('resume-journalier')
  async getResumeJournalier(@Query('boutique') boutique: string) {
    const data = await this.aiService.getResumeJournalier(+boutique);
    return this.responseService.success('Résumé journalier', data);
  }

  /**
   * POST /ai/scan-facture
   * Content-Type: multipart/form-data
   * Champ image : "facture"
   *
   * Analyse une photo de facture fournisseur via LLaVA (Ollama) et retourne
   * les lignes extraites (désignation, quantité, prix unitaire).
   * Prérequis : ollama pull llava
   */
  @Post('scan-facture')
  @UseInterceptors(FileInterceptor('facture', imageMulterOptions))
  async scanFacture(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucune image fournie (champ "facture" requis)');
    const data = await this.aiService.scanFacture(file.buffer);
    return this.responseService.success('Facture analysée', data);
  }
}
