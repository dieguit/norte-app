import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env>);

  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors({ origin: 'http://localhost:3000' });

  const docConfig = new DocumentBuilder()
    .setTitle('Norte Placeholder API')
    .setDescription('TODO: replace placeholder API docs with real app docs')
    .setVersion('0.0.0')
    .addTag('placeholder')
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(config.get('PORT')!);
}
void bootstrap();
