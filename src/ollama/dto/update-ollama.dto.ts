import { PartialType } from '@nestjs/swagger';
import { CreateOllamaDto } from './create-ollama.dto';

export class UpdateOllamaDto extends PartialType(CreateOllamaDto) {}
