import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';//Module pour l'utilisation des fichier .env

import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
  .setTitle('StockFlow API')
  .setDescription('The cats API description')
  .setVersion('1.0')
  .addTag('StockFlow')
  .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {jsonDocumentUrl: 'swagger/json',});

  await app.listen(process.env.APP_PORT?? 3000);
  
}
bootstrap();
