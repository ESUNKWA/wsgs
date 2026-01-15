import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';

  async prompt(model: string, prompt: string): Promise<string> {
    const response = await axios.post(this.ollamaUrl, {
      model,
      prompt,
      stream: false,
    });

    return response.data.response;
  }
}
