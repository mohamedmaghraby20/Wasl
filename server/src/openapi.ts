import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { API_PREFIX } from './config/api';

async function run(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
  });
  app.setGlobalPrefix(API_PREFIX);
  const prefixedDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('WASL API').setVersion('v1').build(),
  );
  await writeFile(
    resolve(process.cwd(), 'openapi.json'),
    JSON.stringify(prefixedDocument, null, 2),
  );
  await app.close();
}

void run().catch((error: unknown) => {
  console.error('OpenAPI generation failed:', error);
  process.exitCode = 1;
});
