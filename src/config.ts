import 'dotenv/config';
import { Injectable } from '@nestjs/common';

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const databaseUrl = env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL must be PostgreSQL');
  const sessionSecret = env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 48)
    throw new Error('SESSION_SECRET must contain at least 48 random characters');
  const bankKey = Buffer.from(env.BANK_TOKEN_KEY ?? '', 'base64url');
  if (bankKey.length !== 32) throw new Error('BANK_TOKEN_KEY must encode 32 random bytes');
  const plaidEnv = env.PLAID_ENV ?? 'sandbox';
  if (!['sandbox', 'production'].includes(plaidEnv)) throw new Error('Invalid PLAID_ENV');
  const port = Number(env.PORT ?? 8765);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const origin = env.APP_ORIGIN ?? `http://127.0.0.1:${port}`;
  if (production && !origin.startsWith('https://'))
    throw new Error('Production APP_ORIGIN must be HTTPS');
  new URL(origin);
  return {
    production,
    databaseUrl,
    sessionSecret,
    bankKey,
    plaidEnv,
    port,
    origin,
    host: env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
    plaidClientId: env.PLAID_CLIENT_ID ?? '',
    plaidSecret: env.PLAID_SECRET ?? '',
    webhookUrl: env.PLAID_WEBHOOK_URL ?? '',
    redirectUri: env.PLAID_REDIRECT_URI ?? '',
  };
}

@Injectable()
export class Config {
  readonly values = readConfig();
}
