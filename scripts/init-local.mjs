import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// Preserve existing local configuration; append only new NestJS settings.
const current = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const keys = new Set(current.split(/\r?\n/).map((line) => line.split('=')[0].trim()));
const values = {
  NODE_ENV: 'development',
  PORT: '8765',
  HOST: '127.0.0.1',
  APP_ORIGIN: 'http://127.0.0.1:8765',
  SESSION_SECRET: randomBytes(48).toString('base64url'),
  BANK_TOKEN_KEY: randomBytes(32).toString('base64url'),
  POSTGRES_PASSWORD: randomBytes(24).toString('base64url'),
};
const previousPassword = current
  .split(/\r?\n/)
  .find((line) => line.startsWith('POSTGRES_PASSWORD='))
  ?.slice('POSTGRES_PASSWORD='.length);
values.DATABASE_URL = `postgresql://ledger:${previousPassword ?? values.POSTGRES_PASSWORD}@127.0.0.1:55441/ledger_nest`;
values.TEST_DATABASE_URL = `postgresql://ledger:${previousPassword ?? values.POSTGRES_PASSWORD}@127.0.0.1:55441/ledger_nest_test`;
const extra = Object.entries(values)
  .filter(([key]) => !keys.has(key))
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');
if (extra) writeFileSync('.env', current + '\n# NestJS configuration\n' + extra + '\n');
console.log('Local NestJS settings initialized; existing values preserved.');
