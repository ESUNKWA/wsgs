import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';//Module pour l'utilisation des fichier .env
import { ConfigService } from '@nestjs/config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  const confiService = app.get(ConfigService);
  //await app.listen(confiService.get('APP_PORT'));
}
bootstrap();
