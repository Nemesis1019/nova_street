import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { join } from "path";

import { AppModule } from "./app.module";
import { HttpExceptionTranslationFilter } from "./common/http-exception-translation.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionTranslationFilter());

  const config = new DocumentBuilder()
    .setTitle("E-commerce API")
    .setDescription("API para tienda y panel administrativo")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, documentFactory);

  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  app.useBodyParser('json', { limit: '5mb' });
  app.useBodyParser('urlencoded', { limit: '5mb', extended: true });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const acrMethod = req.headers['access-control-request-method'] ?? 'none';
        const acao = res.getHeader('access-control-allow-origin') ?? 'none';
        const acam = res.getHeader('access-control-allow-methods') ?? 'none';
        const acah = res.getHeader('access-control-allow-headers') ?? 'none';
        // eslint-disable-next-line no-console
        console.log(`[CORS-DEBUG] ${req.method} ${req.url} — origin: ${req.headers.origin ?? 'none'} — status: ${res.statusCode} — ACR-Method: ${acrMethod} — ACAO: ${acao} — ACAM: ${acam} — ACAH: ${acah} — ${duration}ms`);
      });
      next();
    });
  }
  const rawOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = rawOrigins.length > 0 ? rawOrigins : ['http://localhost:3000'];

  // eslint-disable-next-line no-console
  console.log(`CORS config — NODE_ENV=${process.env.NODE_ENV}, isDev=${isDev}, origins=${JSON.stringify(allowedOrigins)}`);

  app.enableCors({
    origin: isDev ? true : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Accept-Language, X-Requested-With',
    exposedHeaders: 'X-Total-Count',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
