import { Injectable } from '@nestjs/common';
import { GLOBAL_PROMPT_TEMPLATE } from 'src/ollama/prompt.template';

@Injectable()
export class PromptBuilderService {
    build(params: {
    context: string;
    data: any;
    question: string;
    format?: string;
  }): string {
    return GLOBAL_PROMPT_TEMPLATE
      .replace('{{context}}', params.context)
      .replace('{{data}}', JSON.stringify(params.data, null, 2))
      .replace('{{question}}', params.question)
      .replace(
        '{{format}}',
        params.format || 'Réponse texte simple',
      );
  }
}
