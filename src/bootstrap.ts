import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import { Config } from './config.js';
import { csrf } from './auth.js';
import { PlaidError } from './plaid.js';
import { Prisma } from './generated/prisma/client.js';
import { mountClient } from './static.js';

@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException)
      return res.status(error.getStatus()).json(error.getResponse());
    if (error instanceof PlaidError)
      return res.status(503).json({
        detail: 'Bank connection is unavailable or needs authorization.',
        code: error.code,
      });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return res.status(409).json({ detail: 'That record already exists. Please refresh.' });
      if (error.code === 'P2025') return res.status(404).json({ detail: 'Record not found.' });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EBADCSRFTOKEN')
      return res.status(403).json({ detail: 'CSRF token is missing or invalid.' });
    new Logger('HTTP').error(
      `Unhandled server error: ${error instanceof Error ? error.constructor.name : 'unknown'}`,
    );
    return res.status(500).json({ detail: 'Something went wrong. Please try again.' });
  }
}

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: process.env.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  const config = app.get(Config).values;
  app.enableCsrfProtection({ trustedOrigins: [config.origin] });
  app.useSecurityHeaders({ contentSecurityPolicy: false });
  const express = app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  express.set('json replacer', (_key: string, value: unknown) => {
    if (typeof value === 'bigint') {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error('Unsafe monetary total');
      return number;
    }
    return value;
  });
  if (config.production) {
    express.set('trust proxy', 1);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.secure && !/^\/health\/(live|ready)\/?$/.test(req.path))
        return res.redirect(308, config.origin + req.originalUrl);
      next();
    });
  }
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 4,
    connectionTimeoutMillis: 5000,
  });
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: 900,
  });
  app.use(
    session({
      name: 'ledger.sid',
      secret: config.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.production,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600 * 1000,
      },
    }),
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (/^\/webhooks\/plaid\/?$/.test(req.path)) return next();
    return csrf.csrfSynchronisedProtection(req, res, next);
  });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new Errors());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Home Ledger · NestJS API')
      .setDescription(
        'One debit account, two members. Sign in with auth/login to use the ledger. This page is an API development tool.',
      )
      .setVersion('0.2.0')
      .addCookieAuth('ledger.sid')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: false,
      requestInterceptor: async (request: {
        method: string;
        headers: Record<string, string>;
        credentials: string;
      }) => {
        request.credentials = 'same-origin';
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
          const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
          request.headers['X-CSRFToken'] = (await response.json()).csrfToken;
        }
        return request;
      },
    },
  });
  const hasClient = mountClient(app);
  express.get(
    hasClient ? ['/api', '/api/'] : ['/', '/api', '/api/'],
    (_req: Request, res: Response) => res.redirect('/api/docs'),
  );
  const close = app.close.bind(app);
  app.close = async () => {
    store.close();
    await pool.end();
    await close();
  };
  await app.init();
  return app;
}
