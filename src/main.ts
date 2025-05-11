import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';//Module pour l'utilisation des fichier .env

import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: 'http://38.242.232.151:8080',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH','POST','DELETE','OPTIONS'],
    credential: true,
    allowedHeaders: 'Content-Type, Authorization'
  });

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
