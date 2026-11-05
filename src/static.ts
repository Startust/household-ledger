import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';

export function mountClient(app: NestExpressApplication) {
  const root = resolve('web/dist');
  if (!existsSync(resolve(root, 'index.html'))) return false;
  app.useStaticAssets(root, {
    index: false,
    setHeaders(res, path) {
      res.setHeader(
        'Cache-Control',
        path.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });
  const express = app.getHttpAdapter().getInstance();
  express.get(
    /^\/(?!api(?:\/|$)|health(?:\/|$)|webhooks(?:\/|$)).*/,
    (req: Request, res: Response, next: NextFunction) => {
      if (extname(req.path)) return next();
      res.setHeader('Cache-Control', 'no-store');
      return res.sendFile(resolve(root, 'index.html'));
    },
  );
  return true;
}
