import "./common/swagger-path-shim";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { join } from "path";

import { AppModule } from "./app.module";
import { CorsPolicyService } from "./common/cors-policy.service";
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
  // CORS dinámico: subdominios de plataforma + dominios de clientes registrados.
  const corsPolicy = app.get(CorsPolicyService);

  // eslint-disable-next-line no-console
  console.log(`CORS config — NODE_ENV=${process.env.NODE_ENV}, isDev=${isDev} (política multi-tenant)`);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      void corsPolicy
        .isAllowedOrigin(origin)
        .then((allowed) => callback(null, allowed))
        .catch(() => callback(null, false));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Accept-Language, X-Client, X-Tenant, X-Requested-With, X-CSRF-Token',
    exposedHeaders: 'X-Total-Count, X-Tenant',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
