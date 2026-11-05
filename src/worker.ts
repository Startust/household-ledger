import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { setTimeout } from 'node:timers/promises';
import { AppModule } from './app.module.js';
import { Database } from './database.js';
import { SyncService } from './sync.js';
import { DigestService } from './ledger.js';

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const db = app.get(Database),
  sync = app.get(SyncService),
  digests = app.get(DigestService);
let stopped = false;
const abort = new AbortController();
for (const name of ['SIGTERM', 'SIGINT'] as const)
  process.on(name, () => {
    stopped = true;
    abort.abort();
  });
try {
  do {
    try {
      const synced = await sync.runPending();
      for (const home of await db.household.findMany({ select: { id: true } }))
        await digests.generate(home.id);
      await db.loginAttempt.deleteMany({
        where: { window_start: { lt: new Date(Date.now() - 86400000) } },
      });
      if (process.argv.includes('--once')) {
        console.log(`Worker cycle completed; synced=${synced}`);
        break;
      }
    } catch (error) {
      if (process.argv.includes('--once')) throw error;
      console.error('Worker cycle failed; will retry');
    }
    await setTimeout(30000, undefined, { signal: abort.signal }).catch(() => {});
  } while (!stopped);
} finally {
  await app.close();
}
