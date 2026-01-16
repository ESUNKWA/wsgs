import { Body, Controller, Get, Post} from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';
import { AiAnalyseDto } from './AiAnalyseDto';
import { PromptBuilderService } from './ai/prompt-builder/prompt-builder.service';
import { DataProviderService } from './ai/data-provider/data-provider.service';
import { SourceResolverService } from './SourceResolverService';

@Public()
@Controller('ollama')
export class OllamaController {

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly dataProvider: DataProviderService,
    private readonly sourceResolver: SourceResolverService,
  ) {}

  @Post('analyse')
  async analyse(@Body() dto: AiAnalyseDto) {

    const source = this.sourceResolver.resolveSource(dto.ask); // auto-detection
   
    const data = await this.dataProvider.getData(source, {
      boutique: dto.boutiqueId,
    });

    const prompt = this.promptBuilder.build({
      context: `Application de gestion (${source})`,
      data,
      question: dto.ask,
      format: 'Réponse courte en paragraphes',
    });

    const result = await this.ollamaService.prompt('llama3', prompt);

    return {
      source: source,
      question: dto.ask,
      result,
    };
  }
      
}
