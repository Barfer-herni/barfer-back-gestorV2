import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './../http.filter';
import { AnnouncementsService } from './modules/announcements/announcements.service';

async function main() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://barf-ecommerce-client.vercel.app',
      'https://www.barferalimento.com',
      'https://barfer-client-git-feature-payway-integration-barfers-projects.vercel.app',
      
    ],
    // credentials: true,
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

  const announcementsService = app.get(AnnouncementsService);
  await announcementsService.seedAnnouncements();

  const PORT = AppModule.port || 7007;

  await app.listen(PORT);
}

main();
