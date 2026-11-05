import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { AppModule } from './app.module.js';
import { Database } from './database.js';
import { Config } from './config.js';
import { AuthService, passwordHash } from './auth.js';
import { DigestService } from './ledger.js';

async function password() {
  if (!process.stdin.isTTY)
    throw new Error(
      'Use an interactive terminal to enter a password; no password CLI argument is accepted',
    );
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const input = createInterface({ input: process.stdin, output: muted, terminal: true });
  try {
    process.stdout.write('Password (12+ characters, hidden): ');
    const first = await input.question('');
    process.stdout.write('\nConfirm password: ');
    const second = await input.question('');
    process.stdout.write('\n');
    if (first !== second) throw new Error('Passwords do not match');
    return first;
  } finally {
    input.close();
  }
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const db = app.get(Database),
  auth = app.get(AuthService),
  digests = app.get(DigestService);
const [command, value, username] = process.argv.slice(2);
const categoryNames = ['Groceries', 'Dining', 'Home', 'Family', 'Transport', 'Housing', 'Other'];
try {
  if (command === 'seed-demo') {
    if (app.get(Config).values.production)
      throw new Error('Demo seeding is forbidden in production');
    if (await db.household.count()) throw new Error('Demo seeding requires an empty database');
    const now = new Date();
    const encrypted = await passwordHash('LocalDemo!2026', 'demo1');
    const home = await db.$transaction(async (tx) => {
      const home = await tx.household.create({
        data: {
          name: 'Our home (demo)',
          created_at: new Date(now.getTime() - 86400000),
          users: {
            create: [
              { username: 'demo1', password_hash: encrypted },
              { username: 'demo2', password_hash: encrypted },
            ],
          },
          categories: { create: categoryNames.map((name) => ({ name })) },
        },
        include: { categories: true },
      });
      const bank = await tx.bankConnection.create({
        data: {
          household_id: home.id,
          provider: 'demo',
          item_id: 'demo-item',
          account_id: 'demo-checking',
          account_name: 'BOA Checking (demo)',
          mask: '1234',
          initial_sync_complete: true,
          last_synced_at: now,
          sync_completed: 1,
        },
      });
      const rows = [
        { name: 'COSTCO', amount_cents: 12658n, flow: 'expense' as const, category: 'Groceries' },
        {
          name: 'STARBUCKS',
          amount_cents: 1240n,
          flow: 'expense' as const,
          category: 'Dining',
          reviewed: true,
        },
        { name: 'AMAZON', amount_cents: 3999n, flow: 'expense' as const, pending: true },
        { name: 'PAYROLL', amount_cents: -325000n, flow: 'income' as const, reviewed: true },
        {
          name: 'TRANSFER TO SAVINGS',
          amount_cents: 50000n,
          flow: 'transfer' as const,
          reviewed: true,
        },
        {
          name: 'TARGET RETURN',
          amount_cents: -1899n,
          flow: 'refund' as const,
          category: 'Home',
        },
      ];
      for (const [index, { category, ...row }] of rows.entries())
        await tx.ledgerTransaction.create({
          data: {
            ...row,
            bank_id: bank.id,
            provider_id: `demo-${index}`,
            date: new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z'),
            category_id: home.categories.find((c) => c.name === category)?.id,
            labels: {
              create: home.categories
                .filter((c) => c.name === category)
                .map((c) => ({ category_id: c.id })),
            },
            notify_at: row.pending ? null : new Date(now.getTime() - 60000),
          },
        });
      return home;
    });
    await digests.generate(home.id, now, true);
    console.log('LOCAL DEMO: demo1 / demo2, password LocalDemo!2026. No bank network calls.');
  } else if (command === 'create-household') {
    if (!value || !/^[\p{L}\p{N}_@.+-]{1,64}$/u.test(value))
      throw new Error('Usage: npm run cli -- create-household <username>');
    const encrypted = await passwordHash(await password(), value);
    const home = await db.household.create({
      data: {
        name: 'Our home',
        users: { create: { username: value, password_hash: encrypted } },
        categories: { create: categoryNames.map((name) => ({ name })) },
      },
    });
    console.log(`Household created: ${home.id}`);
  } else if (command === 'add-member') {
    if (!value || !username)
      throw new Error('Usage: npm run cli -- add-member <household-id> <username>');
    await auth.addMember(value, username, await password());
    console.log('Second member created');
  } else if (command === 'change-password') {
    if (!value) throw new Error('Usage: npm run cli -- change-password <username>');
    const user = await db.user.findUniqueOrThrow({ where: { username: value } });
    const encrypted = await passwordHash(await password(), value);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { password_hash: encrypted } });
      await tx.$executeRaw`DELETE FROM session WHERE sess->>'userId' = ${user.id}`;
    });
    console.log('Password changed; existing sessions revoked');
  } else throw new Error('Commands: seed-demo, create-household, add-member, change-password');
} finally {
  await app.close();
}
