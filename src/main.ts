import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 👉 Exposition des fichiers statiques (PDF)
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/api',
  });

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: 'https://neurostock.ekwatech.com',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH','POST','DELETE','OPTIONS'],
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization'
  });

  const config = new DocumentBuilder()
    .setTitle('StockFlow API')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('StockFlow')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });

  await app.listen(process.env.APP_PORT ?? 3000);
}

bootstrap();
