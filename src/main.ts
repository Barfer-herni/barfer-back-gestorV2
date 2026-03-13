import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './../http.filter';
import * as compression from 'compression';

async function main() {
  const app = await NestFactory.create(AppModule);

  // Compresión gzip para reducir tamaño de responses (crítico para listas grandes)
  app.use(compression());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://barf-ecommerce-client.vercel.app',
      'https://www.barferalimento.com'

    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1/barfer');
  app.useGlobalFilters(new HttpExceptionFilter());

  const PORT = AppModule.port || 7007;

  await app.listen(PORT);
}

main();
