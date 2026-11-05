import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import { Pool } from 'pg';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../src/bootstrap.js';
import { Database, lockHome } from '../src/database.js';
import { Config, readConfig } from '../src/config.js';
import { AuthService, passwordHash, type Principal } from '../src/auth.js';
import { LedgerService, DigestService, localClock } from '../src/ledger.js';
import { BankService } from '../src/bank.js';
import { ExportService, EXPORT_LIMIT } from '../src/exports.js';
import { exportTotals } from '../src/export-renderer.js';
import {
  PlaidClient,
  PlaidError,
  TokenVault,
  type ProviderTransaction,
  type SyncPage,
} from '../src/plaid.js';
import { SyncService, usdCents } from '../src/sync.js';
import type { NestExpressApplication } from '@nestjs/platform-express';

let app: NestExpressApplication,
  db: Database,
  plaid: PlaidClient,
  vault: TokenVault,
  sync: SyncService;
let ledger: LedgerService, digests: DigestService, auth: AuthService, bankService: BankService;
let homeId: string, bankId: string, categoryId: number, alice: Principal, bob: Principal;
let encryptedPassword: string;
const originalCall = PlaidClient.prototype.call,
  originalSync = PlaidClient.prototype.sync;

before(async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  assert.ok(testUrl, 'TEST_DATABASE_URL is required');
  const url = new URL(testUrl);
  assert.match(url.pathname, /_test$/, 'Only a dedicated *_test database may be used');
  assert.equal(process.env.NODE_ENV === 'production', false, 'Do not test against production');
  const databaseName = url.pathname.slice(1);
  assert.match(databaseName, /^[a-zA-Z0-9_]+$/);
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  const pool = new Pool({ connectionString: maintenance.toString() });
  if (!(await pool.query('SELECT 1 FROM pg_database WHERE datname=$1', [databaseName])).rowCount)
    await pool.query(`CREATE DATABASE "${databaseName}"`);
  await pool.end();
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = randomBytes(48).toString('base64url');
  process.env.BANK_TOKEN_KEY = randomBytes(32).toString('base64url');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  app = await createApp();
  db = app.get(Database);
  plaid = app.get(PlaidClient);
  vault = app.get(TokenVault);
  sync = app.get(SyncService);
  ledger = app.get(LedgerService);
  digests = app.get(DigestService);
  auth = app.get(AuthService);
  bankService = app.get(BankService);
  encryptedPassword = await passwordHash('CorrectPassword!2026', 'alice');
});

beforeEach(async () => {
  plaid.call = originalCall.bind(plaid);
  plaid.sync = originalSync.bind(plaid);
  await db.$executeRawUnsafe(
    'TRUNCATE "Household", "LoginAttempt", session RESTART IDENTITY CASCADE',
  );
  const home = await db.household.create({
    data: {
      created_at: new Date('2026-01-01T00:00:00Z'),
      users: {
        create: [
          { username: 'alice', password_hash: encryptedPassword },
          { username: 'bob', password_hash: encryptedPassword },
        ],
      },
      categories: { create: { name: '买菜' } },
    },
    include: { users: true, categories: true },
  });
  homeId = home.id;
  const principal = (name: string) => {
    const user = home.users.find((u) => u.username === name)!;
    return { id: user.id, username: user.username, household_id: home.id };
  };
  alice = principal('alice');
  bob = principal('bob');
  categoryId = home.categories[0].id;
  const bank = await db.bankConnection.create({
    data: {
      household_id: homeId,
      item_id: 'item-1',
      account_id: 'checking-1',
      account_name: 'BOA Checking',
      encrypted_access_token: vault.encrypt('secret-access-token', homeId),
    },
  });
  bankId = bank.id;
});
after(async () => {
  if (app) await app.close();
});

function item(id = 'tx-1', changes: Partial<ProviderTransaction> = {}): ProviderTransaction {
  return {
    transaction_id: id,
    account_id: 'checking-1',
    amount: 12.34,
    iso_currency_code: 'USD',
    date: '2026-11-05',
    name: 'Grocery',
    merchant_name: 'Grocery',
    pending: false,
    personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
    ...changes,
  };
}
function page(added: ProviderTransaction[] = [], changes: Partial<SyncPage> = {}): SyncPage {
  return {
    added,
    modified: [],
    removed: [],
    next_cursor: 'cursor-1',
    has_more: false,
    transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE',
    ...changes,
  };
}
function fakePages(pages: (SyncPage | Error)[]) {
  const cursors: string[] = [];
  plaid.sync = async (token, cursor) => {
    assert.equal(token, 'secret-access-token');
    cursors.push(cursor);
    const value = pages.shift();
    if (value instanceof Error) throw value;
    assert.ok(value, 'Unexpected sync call');
    return value;
  };
  return cursors;
}
async function imported() {
  fakePages([page([item()])]);
  assert.equal(await sync.run(bankId, true), true);
  return db.ledgerTransaction.findFirstOrThrow();
}
async function login(username = 'alice') {
  const agent = request.agent(app.getHttpServer());
  const first = await agent.get('/api/auth/csrf').expect(200);
  const response = await agent
    .post('/api/auth/login')
    .set('X-CSRFToken', first.body.csrfToken)
    .send({ username, password: 'CorrectPassword!2026' })
    .expect(201);
  return {
    agent,
    token: response.body.csrfToken as string,
    before: first.headers['set-cookie'],
    after: response.headers['set-cookie'],
  };
}

test('configuration fails closed for missing keys, non-Postgres or insecure production origin', () => {
  assert.throws(() => readConfig({}), /DATABASE_URL/);
  assert.throws(() => readConfig({ DATABASE_URL: 'postgresql://localhost/db' }), /SESSION_SECRET/);
  assert.throws(() => readConfig({ ...process.env, BANK_TOKEN_KEY: 'bad' }), /BANK_TOKEN_KEY/);
  assert.throws(
    () => readConfig({ ...process.env, NODE_ENV: 'production', APP_ORIGIN: 'http://localhost' }),
    /HTTPS/,
  );
});

test('exports require login, reject unknown inputs and ignore neither invalid month nor format', async () => {
  for (const format of ['csv', 'pdf'])
    await request(app.getHttpServer())
      .get('/api/exports/transactions?format=' + format)
      .expect(403);
  const member = await login();
  for (const query of [
    'format=html',
    'format=pdf&month=2026-13',
    'format=csv&pending=yes',
    'format=csv&household_id=elsewhere',
    'format=csv&page=2',
  ])
    await member.agent.get('/api/exports/transactions?' + query).expect(400);
});

test('CSV exports all pages, keeps exact cents and escapes spreadsheet formulas and multiline notes', async () => {
  await db.ledgerTransaction.createMany({
    data: Array.from({ length: 55 }, (_, i) => ({
      bank_id: bankId,
      provider_id: 'export-' + i,
      date: new Date('2026-11-05'),
      name: i === 0 ? '=HYPERLINK("test")' : 'Purchase ' + i,
      amount_cents: 1234n,
      flow: 'expense' as const,
      note: i === 0 ? '  +formula,\n"quoted" 中文' : '',
    })),
  });
  const member = await login();
  const list = await member.agent.get('/api/transactions').expect(200);
  assert.equal(list.body.results.length, 50);
  const file = await member.agent
    .get('/api/exports/transactions?format=csv&month=2026-11')
    .expect(200);
  assert.match(file.headers['content-type'], /text\/csv/);
  assert.match(
    file.headers['content-disposition'],
    /attachment; filename="home-ledger-2026-11.csv"/,
  );
  assert.match(file.headers['cache-control'], /no-store/);
  const text = file.text;
  assert.equal(text.charCodeAt(0), 0xfeff);
  assert.equal((text.match(/,12\.34,,/g) ?? []).length, 55);
  assert.ok(text.includes('"\'=HYPERLINK(""test"")"'));
  assert.ok(text.includes('"\'  +formula,\n""quoted"" 中文"'));
  assert.ok(text.endsWith('\r\n'));
});

test('export uses the same month, search and review filters and excludes removed and foreign rows', async () => {
  const row = await imported();
  await db.ledgerTransaction.update({
    where: { id: row.id },
    data: { note: 'Find this', category_id: categoryId },
  });
  await db.ledgerTransaction.createMany({
    data: [
      {
        bank_id: bankId,
        provider_id: 'outside',
        date: new Date('2026-10-31'),
        name: 'Find this outside',
        amount_cents: 1n,
        flow: 'expense',
      },
      {
        bank_id: bankId,
        provider_id: 'removed',
        date: new Date('2026-11-01'),
        name: 'Find this removed',
        amount_cents: 1n,
        flow: 'expense',
        removed: true,
      },
      {
        bank_id: bankId,
        provider_id: 'pending',
        date: new Date('2026-11-01'),
        name: 'Find this pending',
        amount_cents: 1n,
        flow: 'expense',
        pending: true,
      },
      {
        bank_id: bankId,
        provider_id: 'reviewed',
        date: new Date('2026-11-01'),
        name: 'Find this reviewed',
        amount_cents: 1n,
        flow: 'expense',
        reviewed: true,
      },
    ],
  });
  await db.household.create({
    data: {
      bank: {
        create: {
          item_id: 'other-export',
          account_name: 'Other',
          transactions: {
            create: {
              provider_id: 'secret',
              date: new Date('2026-11-05'),
              name: 'Find this secret',
              amount_cents: 1n,
              flow: 'expense',
            },
          },
        },
      },
    },
  });
  const q = {
    format: 'csv' as const,
    month: '2026-11',
    search: 'find THIS',
    pending: 'false',
    reviewed: 'false',
    uncategorized: 'false',
  };
  const exported = await app.get(ExportService).data(alice, q);
  const listed = await ledger.transactions(alice, q);
  assert.deepEqual(
    exported.rows.map((r) => r.id),
    listed.results.map((r) => r.id),
  );
  assert.deepEqual(
    exported.rows.map((r) => r.id),
    [row.id],
  );
  const all = await app.get(ExportService).data(alice, { format: 'csv' });
  assert.equal(all.rows.length, 4);
  assert.ok(!all.rows.some((r) => r.removed || r.name.includes('secret')));
});

test('export totals exclude pending and transfers and count refunds without losing cents', async () => {
  await db.ledgerTransaction.createMany({
    data: [
      { amount_cents: 12658n, flow: 'expense' as const },
      { amount_cents: 1240n, flow: 'expense' as const },
      { amount_cents: -1899n, flow: 'refund' as const },
      { amount_cents: -325000n, flow: 'income' as const },
      { amount_cents: 50000n, flow: 'transfer' as const },
      { amount_cents: 3999n, flow: 'expense' as const, pending: true },
    ].map((row, i) => ({
      ...row,
      bank_id: bankId,
      provider_id: 'totals-' + i,
      name: 'Entry ' + i,
      date: new Date('2026-11-05'),
    })),
  });
  const data = await app.get(ExportService).data(alice, { format: 'pdf', month: '2026-11' });
  assert.deepEqual(exportTotals(data), {
    income: 325000n,
    spending: 13898n,
    refunds: 1899n,
    net: 11999n,
    pending: 1,
    transfers: 1,
  });
  const member = await login();
  const csv = await member.agent.get('/api/exports/transactions?format=csv').expect(200);
  assert.match(csv.text, /,126\.58,,/);
  assert.match(csv.text, /,,18\.99,/);
  assert.match(csv.text, /"Pending","Not available"/);
});

test('PDF export produces a complete paginated attachment with an embedded Unicode font', async () => {
  await db.ledgerTransaction.createMany({
    data: Array.from({ length: 70 }, (_, i) => ({
      bank_id: bankId,
      provider_id: 'pdf-' + i,
      name: '商店 Grocery ' + i,
      date: new Date('2026-11-05'),
      amount_cents: 1234n,
      flow: 'expense' as const,
      note: i === 0 ? '周末采购 ' + 'Long note '.repeat(95) : 'Weekly groceries',
    })),
  });
  const member = await login();
  const file = await member.agent
    .get('/api/exports/transactions?format=pdf&month=2026-11')
    .expect(200);
  assert.match(file.headers['content-type'], /application\/pdf/);
  assert.match(file.headers['content-disposition'], /home-ledger-2026-11.pdf/);
  assert.match(file.headers['cache-control'], /no-store/);
  assert.ok(Buffer.isBuffer(file.body));
  const pdf = file.body.toString('latin1');
  assert.ok(pdf.startsWith('%PDF-'));
  assert.ok(pdf.trimEnd().endsWith('%%EOF'));
  assert.ok((pdf.match(/\/Type \/Page\b/g) ?? []).length > 1);
  assert.match(pdf, /\/FontFile3/);
  assert.match(pdf, /\/ToUnicode/);
});

test('empty CSV/PDF exports remain valid and oversized exports fail without truncation', async () => {
  const member = await login();
  const csv = await member.agent.get('/api/exports/transactions?format=csv').expect(200);
  assert.equal(csv.text.split('\r\n').length, 2);
  const pdf = await member.agent.get('/api/exports/transactions?format=pdf').expect(200);
  assert.equal((pdf.body.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1);
  await db.ledgerTransaction.createMany({
    data: Array.from({ length: EXPORT_LIMIT + 1 }, (_, i) => ({
      bank_id: bankId,
      provider_id: 'limit-' + i,
      name: 'Limit fixture',
      date: new Date('2026-11-05'),
      amount_cents: 1n,
      flow: 'expense' as const,
    })),
  });
  await member.agent.get('/api/exports/transactions?format=csv').expect(422);
  await member.agent.get('/api/exports/transactions?format=pdf').expect(422);
});

test('PWA routes serve the shell, static assets and manifest without masking API errors', async () => {
  const http = request(app.getHttpServer());
  const root = await http.get('/').expect(200).expect('Content-Type', /html/);
  assert.match(root.text, /lang="en"/);
  assert.match(root.headers['cache-control'], /no-store/);
  await http.get('/oauth?oauth_state_id=test').expect(200).expect('Content-Type', /html/);
  const manifest = await http.get('/manifest.webmanifest').expect(200);
  const metadata = JSON.parse(manifest.text);
  assert.equal(metadata.display, 'standalone');
  assert.equal(metadata.start_url, '/');
  for (const icon of metadata.icons)
    await http.get(icon.src).expect(200).expect('Content-Type', /png/);
  const asset = root.text.match(/src="([^"]+\.js)"/)![1];
  await http
    .get(asset)
    .expect(200)
    .expect('Cache-Control', /immutable/);
  await http
    .get('/sw.js')
    .expect(200)
    .expect('Cache-Control', /no-cache/);
  await http.get('/api/not-a-route').expect(404).expect('Content-Type', /json/);
  await http.get('/health/not-a-route').expect(404);
  await http.get('/webhooks/not-a-route').expect(404);
  await http.get('/missing.js').expect(404);
  const member = await login();
  await member.agent
    .get('/api/transactions')
    .expect(200)
    .expect('Cache-Control', /no-store/);
});

test('password change verifies current password, validates replacement and requires CSRF', async () => {
  const member = await login();
  const body = { current_password: 'WrongPassword!2026', new_password: 'ReplacementSecret!2026' };
  await member.agent.post('/api/auth/password').send(body).expect(403);
  await member.agent
    .post('/api/auth/password')
    .set('X-CSRFToken', member.token)
    .send(body)
    .expect(403);
  await member.agent
    .post('/api/auth/password')
    .set('X-CSRFToken', member.token)
    .send({ current_password: 'CorrectPassword!2026', new_password: 'short' })
    .expect(400);
  await member.agent.get('/api/auth/me').expect(200);
  await auth.authenticate('alice', 'CorrectPassword!2026', 'test');
});

test('password change revokes this user on every device and preserves the other member', async () => {
  const first = await login(),
    second = await login(),
    other = await login('bob');
  await first.agent
    .post('/api/auth/password')
    .set('X-CSRFToken', first.token)
    .send({ current_password: 'CorrectPassword!2026', new_password: 'ReplacementSecret!2026' })
    .expect(200, { changed: true, login_required: true });
  await first.agent.get('/api/auth/me').expect(403);
  await second.agent.get('/api/auth/me').expect(403);
  await other.agent.get('/api/auth/me').expect(200);
  await assert.rejects(auth.authenticate('alice', 'CorrectPassword!2026', 'test'));
  assert.equal((await auth.authenticate('alice', 'ReplacementSecret!2026', 'test')).id, alice.id);
});

test('notes and review can be edited while keeping an archived category', async () => {
  const row = await imported();
  const assigned = await ledger.edit(alice, row.id, { version: row.version, category: categoryId });
  await db.category.update({ where: { id: categoryId }, data: { active: false } });
  const updated = await ledger.edit(alice, row.id, {
    version: assigned.version,
    note: 'Weekly groceries',
    reviewed: true,
  });
  assert.equal(updated.category, categoryId);
  assert.equal(updated.reviewed, true);
  assert.equal(updated.note, 'Weekly groceries');
});
test('initial sync and replay preserve exactly one transaction and one version', async () => {
  const cursors = fakePages([page([item()]), page([item()])]);
  assert.equal(await sync.run(bankId, true), true);
  assert.equal(await sync.run(bankId, true), true);
  const rows = await db.ledgerTransaction.findMany();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount_cents, 1234n);
  assert.equal(rows[0].version, 1);
  assert.equal(rows[0].notify_at, null);
  assert.deepEqual(cursors, ['', 'cursor-1']);
});
test('pending replacement across pages keeps category/note and resets changed-amount review', async () => {
  fakePages([page([item('pending', { pending: true })])]);
  await sync.run(bankId, true);
  const pending = await db.ledgerTransaction.findFirstOrThrow();
  await ledger.edit(alice, pending.id, {
    version: 1,
    category: categoryId,
    note: 'family',
    reviewed: true,
  });
  fakePages([
    page([], { removed: [{ transaction_id: 'pending' }], has_more: true, next_cursor: 'middle' }),
    page([item('posted', { amount: 15.67, pending_transaction_id: 'pending' })], {
      next_cursor: 'end',
    }),
  ]);
  assert.equal(await sync.run(bankId, true), true);
  const posted = await db.ledgerTransaction.findFirstOrThrow({ where: { provider_id: 'posted' } });
  assert.equal(posted.category_id, categoryId);
  assert.equal(posted.note, 'family');
  assert.equal(posted.reviewed, false);
  assert.ok(posted.notify_at);
  assert.equal(await db.ledgerTransaction.count({ where: { removed: false } }), 1);
});
test('modified and removed transactions preserve manual flow and ignore other accounts', async () => {
  const row = await imported();
  await ledger.edit(alice, row.id, {
    version: 1,
    category: categoryId,
    flow: 'transfer',
    reviewed: true,
  });
  fakePages([
    page([item('ignored', { account_id: 'credit' })], {
      modified: [item('tx-1', { amount: 14.5 })],
    }),
  ]);
  await sync.run(bankId, true);
  const changed = await db.ledgerTransaction.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(changed.flow, 'transfer');
  assert.equal(changed.category_id, categoryId);
  assert.equal(changed.reviewed, false);
  assert.equal(await db.ledgerTransaction.count(), 1);
  fakePages([page([], { removed: [{ transaction_id: 'tx-1' }] })]);
  await sync.run(bankId, true);
  assert.equal((await ledger.transaction(alice, row.id)).removed, true);
});
test('pagination mutation restarts from original cursor and discards first attempt', async () => {
  const cursors = fakePages([
    page([item('discard')], { has_more: true, next_cursor: 'middle' }),
    new PlaidError('TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'),
    page([item('keep')]),
  ]);
  await sync.run(bankId, true);
  assert.deepEqual(cursors, ['', 'middle', '']);
  assert.equal((await db.ledgerTransaction.findFirstOrThrow()).provider_id, 'keep');
});
test('partial network failure commits neither records nor cursor and records backoff', async () => {
  fakePages([
    page([item()], { has_more: true, next_cursor: 'middle' }),
    new PlaidError('PROVIDER_UNAVAILABLE'),
  ]);
  assert.equal(await sync.run(bankId, true), false);
  const bank = await db.bankConnection.findUniqueOrThrow({ where: { id: bankId } });
  assert.equal(bank.cursor, '');
  assert.equal(bank.failures, 1);
  assert.equal(bank.sync_completed, 0);
  assert.ok(bank.next_attempt_at.getTime() > Date.now());
  assert.equal(await db.ledgerTransaction.count(), 0);
});
for (const invalid of ['NaN', '1.001', '1e20', Infinity])
  test(`invalid cents ${invalid} rollback the entire batch`, async () => {
    fakePages([page([item('good'), item('bad', { amount: invalid })])]);
    assert.equal(await sync.run(bankId, true), false);
    assert.equal(await db.ledgerTransaction.count(), 0);
    assert.equal((await db.bankConnection.findUniqueOrThrow({ where: { id: bankId } })).cursor, '');
  });
test('non-USD account transaction fails atomically', async () => {
  fakePages([page([item('bad', { iso_currency_code: 'CAD' })])]);
  assert.equal(await sync.run(bankId, true), false);
});
test('money parser avoids binary floating point rounding', () => {
  assert.equal(usdCents(0.29), 29n);
  assert.equal(usdCents('-18.99'), -1899n);
  assert.equal(usdCents(100), 10000n);
});
test('reauthorization errors and duplicate work requests are durable', async () => {
  fakePages([new PlaidError('ITEM_LOGIN_REQUIRED')]);
  assert.equal(await sync.run(bankId, true), false);
  assert.equal(
    (await db.bankConnection.findUniqueOrThrow({ where: { id: bankId } })).state,
    'reauth_required',
  );
  await sync.request(bankId);
  await sync.request(bankId);
  fakePages([]);
  assert.equal(await sync.run(bankId), false);
  fakePages([page([item()])]);
  assert.equal(await sync.run(bankId, true), true);
  const bank = await db.bankConnection.findUniqueOrThrow({ where: { id: bankId } });
  assert.equal(bank.sync_requested, 3);
  assert.equal(bank.sync_completed, 3);
  fakePages([]);
  assert.equal(await sync.run(bankId), false);
});
test('bank token ciphertext is authenticated and bound to its household', () => {
  const token = vault.encrypt('secret', homeId);
  assert.equal(token.includes('secret'), false);
  assert.equal(vault.decrypt(token, homeId), 'secret');
  assert.throws(() => vault.decrypt(token, 'another-home'), /TOKEN_DECRYPTION_FAILED/);
  assert.throws(
    () => vault.decrypt(token.slice(0, -4) + 'aaaa', homeId),
    /TOKEN_DECRYPTION_FAILED/,
  );
});
test('anonymous clients cannot read or write private routes', async () => {
  await request(app.getHttpServer()).get('/api/transactions').expect(403);
  await request(app.getHttpServer()).get('/api/bank').expect(403);
  await request(app.getHttpServer()).patch('/api/household').send({ name: 'attack' }).expect(403);
});
test('real login uses CSRF, rotates the session, and logout revokes access', async () => {
  await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: 'alice', password: 'CorrectPassword!2026' })
    .expect(403);
  const { agent, token, before: previous, after: current } = await login();
  assert.notDeepEqual(previous, current);
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/categories').send({ name: 'blocked' }).expect(403);
  await agent.post('/api/categories').set('X-CSRFToken', token).send({ name: 'new' }).expect(201);
  await agent.post('/api/auth/logout').set('X-CSRFToken', token).expect(201);
  await agent.get('/api/auth/me').expect(403);
});
test('login cross-origin requests and unknown DTO properties are rejected', async () => {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent.get('/api/auth/csrf');
  await agent
    .post('/api/auth/login')
    .set('Origin', 'https://attacker.invalid')
    .set('Sec-Fetch-Site', 'cross-site')
    .set('X-CSRFToken', csrf.body.csrfToken)
    .send({ username: 'alice', password: 'CorrectPassword!2026' })
    .expect(403);
  const logged = await login();
  await logged.agent
    .patch('/api/household')
    .set('X-CSRFToken', logged.token)
    .send({ household_id: 'other' })
    .expect(400);
});
test('two members see shared edits and reject stale versions over HTTP', async () => {
  const row = await imported();
  const first = await login(),
    second = await login('bob');
  await first.agent
    .patch(`/api/transactions/${row.id}`)
    .set('X-CSRFToken', first.token)
    .send({ version: 1, category: categoryId, reviewed: true })
    .expect(200);
  assert.equal((await second.agent.get(`/api/transactions/${row.id}`)).body.category_name, '买菜');
  await second.agent
    .patch(`/api/transactions/${row.id}`)
    .set('X-CSRFToken', second.token)
    .send({ version: 1, note: 'stale' })
    .expect(409);
  await second.agent
    .patch(`/api/transactions/${row.id}`)
    .set('X-CSRFToken', second.token)
    .send({ version: 2, note: 'ok' })
    .expect(200);
  assert.equal((await ledger.history(alice, row.id))[0].actor, 'bob');
});
test('two simultaneous transaction writers produce one success and one conflict', async () => {
  const row = await imported();
  const results = await Promise.allSettled([
    ledger.edit(alice, row.id, { version: 1, note: 'a' }),
    ledger.edit(bob, row.id, { version: 1, note: 'b' }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  assert.equal(
    (await db.ledgerTransaction.findUniqueOrThrow({ where: { id: row.id } })).version,
    2,
  );
});
test('foreign household rows, categories and receipts cannot be accessed', async () => {
  const other = await db.household.create({
    data: { categories: { create: { name: 'private' } } },
    include: { categories: true },
  });
  const row = await imported();
  const { agent, token } = await login();
  await agent.get(`/api/categories/${other.categories[0].id}`).expect(404);
  await agent
    .patch(`/api/transactions/${row.id}`)
    .set('X-CSRFToken', token)
    .send({ version: 1, category: other.categories[0].id })
    .expect(400);
  const foreign = await digests.generate(other.id, undefined, true);
  await agent.get(`/api/digests/${foreign!.id}`).expect(404);
  await agent.post(`/api/digests/${foreign!.id}/read`).set('X-CSRFToken', token).expect(404);
});
test('input validates sign, version, timezone, pagination and editable fields', async () => {
  const row = await imported();
  const { agent, token } = await login();
  for (const body of [
    { reviewed: true },
    { version: 1, flow: 'refund' },
    { version: 1, amount_cents: 1 },
    { version: 1, reviewed: null },
  ])
    await agent
      .patch(`/api/transactions/${row.id}`)
      .set('X-CSRFToken', token)
      .send(body)
      .expect(400);
  await agent
    .patch('/api/household')
    .set('X-CSRFToken', token)
    .send({ timezone: 'bad/zone' })
    .expect(400);
  await agent
    .patch('/api/household')
    .set('X-CSRFToken', token)
    .send({ digest_hour: 24 })
    .expect(400);
  await agent.get('/api/transactions?page=-1').expect(400);
  await agent.get('/api/summary?month=2026-13').expect(400);
});
test('classification can be archived and case-insensitive duplicate names are rejected', async () => {
  await ledger.createCategory(alice, 'Dining');
  await assert.rejects(() => ledger.createCategory(alice, 'dining'));
  await ledger.updateCategory(alice, categoryId, { active: false });
  const row = await imported();
  await assert.rejects(() => ledger.edit(alice, row.id, { version: 1, category: categoryId }));
});
test('a third family member is rejected', async () => {
  await assert.rejects(
    () => auth.addMember(homeId, 'third', 'CorrectPassword!2026'),
    /two members/,
  );
  assert.equal(await db.user.count(), 2);
});
test('login attempts are limited in PostgreSQL', async () => {
  for (let n = 0; n < 10; n++)
    await assert.rejects(() => auth.authenticate('missing', 'wrong', 'test-ip'));
  await assert.rejects(
    () => auth.authenticate('missing', 'wrong', 'test-ip'),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      (error as { getStatus(): number }).getStatus() === 429,
  );
});
test('summary excludes pending, removed and transfers and offsets refunds', async () => {
  const rows = [
    { provider_id: 'expense', amount_cents: 10000n, flow: 'expense' as const },
    { provider_id: 'refund', amount_cents: -2000n, flow: 'refund' as const },
    { provider_id: 'income', amount_cents: -300000n, flow: 'income' as const },
    { provider_id: 'transfer', amount_cents: 50000n, flow: 'transfer' as const },
    { provider_id: 'pending', amount_cents: 99999n, flow: 'expense' as const, pending: true },
    { provider_id: 'removed', amount_cents: 99999n, flow: 'expense' as const, removed: true },
  ];
  for (const row of rows)
    await db.ledgerTransaction.create({
      data: {
        ...row,
        bank_id: bankId,
        name: row.provider_id,
        date: new Date('2026-11-05'),
        category_id: categoryId,
      },
    });
  const summary = await ledger.summary(alice, '2026-11');
  assert.equal(summary.net_spend_cents, 8000n);
  assert.equal(summary.income_cents, 300000n);
  assert.equal(summary.transfer_count, 1);
});
for (const [instant, due] of [
  ['2026-07-02T00:59:00Z', false],
  ['2026-07-02T01:00:00Z', true],
  ['2026-11-06T01:59:00Z', false],
  ['2026-11-06T02:00:00Z', true],
] as const)
  test(`daily digest respects local 21:00 and DST at ${instant}`, async () => {
    assert.equal(!!(await digests.generate(homeId, new Date(instant))), due);
  });
test('digest history suppression, deduplication, catchup and per-user receipts', async () => {
  const now = new Date('2026-11-06T02:00:00Z');
  for (const [id, notify] of [
    ['history', null],
    ['new', new Date(now.getTime() - 60000)],
  ] as const)
    await db.ledgerTransaction.create({
      data: {
        bank_id: bankId,
        provider_id: id,
        name: id,
        amount_cents: 1234n,
        flow: 'expense',
        date: new Date('2026-11-05'),
        notify_at: notify,
      },
    });
  const first = await digests.generate(homeId, now);
  assert.equal(first!.new_count, 1);
  assert.equal((await digests.generate(homeId, now))!.id, first!.id);
  await digests.markRead(alice, first!.id);
  assert.equal((await digests.get(alice, first!.id)).read, true);
  assert.equal((await digests.get(bob, first!.id)).read, false);
  await db.ledgerTransaction.create({
    data: {
      bank_id: bankId,
      provider_id: 'later',
      name: 'later',
      amount_cents: 500n,
      flow: 'expense',
      date: new Date('2026-11-06'),
      notify_at: new Date(now.getTime() + 86400000),
    },
  });
  const later = await digests.generate(homeId, new Date(now.getTime() + 2 * 86400000));
  assert.equal(later!.new_count, 1);
});
test('digest waits for in-flight sync so a transaction cannot fall between watermarks', async () => {
  await db.bankConnection.update({ where: { id: bankId }, data: { initial_sync_complete: true } });
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const unblock = new Promise<void>((resolve) => {
    release = resolve;
  });
  plaid.sync = async () => {
    entered();
    await unblock;
    return page([item('racing')]);
  };
  const syncing = sync.run(bankId, true);
  await started;
  const digesting = digests.generate(homeId, undefined, true);
  release();
  await syncing;
  const digest = await digesting;
  assert.equal(digest!.new_count, 1);
});
test('account exchange retains encrypted credentials after wrong account selection', async () => {
  await db.bankConnection.delete({ where: { id: bankId } });
  plaid.call = (async (path: string) =>
    path === '/item/public_token/exchange'
      ? { item_id: 'new-item', access_token: 'new-token' }
      : {
          accounts: [
            {
              account_id: 'checking',
              name: 'Checking',
              type: 'depository',
              subtype: 'checking',
              balances: { iso_currency_code: 'USD' },
            },
            {
              account_id: 'credit',
              name: 'Credit',
              type: 'credit',
              subtype: 'credit card',
              balances: { iso_currency_code: 'USD' },
            },
          ],
        }) as typeof plaid.call;
  await assert.rejects(() => bankService.exchange(homeId, 'public-token', 'credit'));
  const bank = await db.bankConnection.findUniqueOrThrow({ where: { household_id: homeId } });
  assert.equal(bank.state, 'awaiting_account');
  assert.equal(vault.decrypt(bank.encrypted_access_token, homeId), 'new-token');
  assert.equal((await bankService.selectAccount(homeId, 'checking')).state, 'connected');
  await assert.rejects(() => bankService.exchange(homeId, 'another-token'), /already exists/);
  assert.equal(JSON.stringify(await bankService.get(homeId)).includes('token'), false);
});
test('Link creates checking-only Transactions access and uses existing token for reauth', async () => {
  const payloads: Record<string, unknown>[] = [];
  plaid.call = (async (_path: string, payload: Record<string, unknown>) => {
    payloads.push(payload);
    return { link_token: 'link', expiration: 'future' };
  }) as typeof plaid.call;
  assert.equal((await bankService.linkToken(homeId)).update_mode, true);
  assert.equal(payloads[0].access_token, 'secret-access-token');
  assert.equal(payloads[0].products, undefined);
  await db.bankConnection.delete({ where: { id: bankId } });
  assert.equal((await bankService.linkToken(homeId)).update_mode, false);
  assert.deepEqual(payloads[1].products, ['transactions']);
  assert.deepEqual(payloads[1].account_filters, { depository: { account_subtypes: ['checking'] } });
});
test('signed webhook verifies ES256, body hash and age; duplicate events only request sync', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const kid = randomBytes(8).toString('hex');
  const jwk = { ...(await exportJWK(publicKey)), alg: 'ES256', kid, expired_at: null };
  plaid.call = (async () => ({ key: jwk })) as typeof plaid.call;
  const body = Buffer.from(
    JSON.stringify({
      item_id: 'item-1',
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'SYNC_UPDATES_AVAILABLE',
    }),
  );
  const sign = (iat = Math.floor(Date.now() / 1000)) =>
    new SignJWT({ request_body_sha256: createHash('sha256').update(body).digest('hex') })
      .setProtectedHeader({ alg: 'ES256', kid })
      .setIssuedAt(iat)
      .sign(privateKey);
  const token = await sign();
  assert.equal(await plaid.verifyWebhook(body, token), true);
  assert.equal(await plaid.verifyWebhook(Buffer.concat([body, Buffer.from(' ')]), token), false);
  assert.equal(
    await plaid.verifyWebhook(body, await sign(Math.floor(Date.now() / 1000) - 301)),
    false,
  );
  assert.equal(
    await plaid.verifyWebhook(body, await sign(Math.floor(Date.now() / 1000) + 60)),
    false,
  );
  for (let n = 0; n < 2; n++)
    await request(app.getHttpServer())
      .post('/webhooks/plaid')
      .set('Content-Type', 'application/json')
      .set('Plaid-Verification', token)
      .send(body.toString())
      .expect(200);
  assert.equal(
    (await db.bankConnection.findUniqueOrThrow({ where: { id: bankId } })).sync_requested,
    3,
  );
  await request(app.getHttpServer())
    .post('/webhooks/plaid')
    .send({ item_id: 'item-1' })
    .expect(401);
});
test('health and OpenAPI endpoints work without exposing bank data', async () => {
  await request(app.getHttpServer()).get('/health/ready').expect(200);
  const schema = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  assert.ok(schema.body.paths['/api/transactions/{id}']);
  assert.equal(JSON.stringify(schema.body).includes('secret-access-token'), false);
  assert.equal(localClock(new Date('2026-11-06T02:00:00Z'), 'America/New_York').hour, 21);
});
