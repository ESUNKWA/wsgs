import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { AiAnalyseDto } from './AiAnalyseDto';
import { PromptBuilderService } from './ai/prompt-builder/prompt-builder.service';
import { DataProviderService } from './ai/data-provider/data-provider.service';
import { SourceResolverService } from './SourceResolverService';
import { TenantService } from 'src/tenant/tenant.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Public()
@Controller('ollama')
export class OllamaController {

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly dataProvider: DataProviderService,
    private readonly sourceResolver: SourceResolverService,
    private readonly tenantService: TenantService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('analyse')
  async analyse(@Body() dto: AiAnalyseDto) {
    if (!dto.structureId) {
      throw new BadRequestException('structureId est requis pour l\'analyse IA');
    }

    const source = this.sourceResolver.resolveSource(dto.ask);
    const tenantDs = await this.tenantService.getDataSource(dto.structureId);

    // Exécuter dans le contexte tenant pour que VenteService/ProduitService
    // trouvent le bon DataSource via AsyncLocalStorage
    const data = await this.tenantContext.run(dto.structureId, tenantDs, () =>
      this.dataProvider.getData(source, { boutique: dto.boutiqueId }),
    );

    const prompt = this.promptBuilder.build({
      context: `Application de gestion (${source})`,
      data,
      question: dto.ask,
      format: 'Réponse courte en paragraphes',
    });

    const result = await this.ollamaService.prompt('llama3', prompt);

    return { source, question: dto.ask, result };
  }
}
