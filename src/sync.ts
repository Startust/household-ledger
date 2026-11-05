import { Injectable, Logger } from '@nestjs/common';
import { Database, lockHome, lockBank, lockTransaction, type Tx } from './database.js';
import {
  PlaidClient,
  PlaidError,
  TokenVault,
  type ProviderTransaction,
  type SyncPage,
} from './plaid.js';
import type { BankConnection, Flow } from './generated/prisma/client.js';
import { transactionCategories, transactionInclude } from './ledger.js';

export function usdCents(amount: number | string) {
  const text = String(amount);
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new PlaidError('INVALID_TRANSACTION_AMOUNT');
  const negative = text.startsWith('-');
  const [whole, part = ''] = text.replace('-', '').split('.');
  const result = (BigInt(whole) * 100n + BigInt(part.padEnd(2, '0'))) * (negative ? -1n : 1n);
  if (result > 100000000000000n || result < -100000000000000n)
    throw new PlaidError('INVALID_TRANSACTION_AMOUNT');
  return result;
}
function dateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PlaidError('INVALID_TRANSACTION_DATE');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new PlaidError('INVALID_TRANSACTION_DATE');
  return date;
}
function providerValues(item: ProviderTransaction) {
  if (item.iso_currency_code !== 'USD') throw new PlaidError('UNSUPPORTED_CURRENCY');
  if (
    typeof item.name !== 'string' ||
    typeof item.pending !== 'boolean' ||
    typeof item.transaction_id !== 'string' ||
    item.transaction_id.length > 150
  )
    throw new PlaidError('INVALID_TRANSACTION_DATA');
  const cents = usdCents(item.amount);
  const pfc = item.personal_finance_category;
  const flow: Flow = ['TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS'].includes(pfc?.primary ?? '')
    ? 'transfer'
    : cents < 0n
      ? 'income'
      : 'expense';
  return {
    amount_cents: cents,
    currency: 'USD',
    date: dateOnly(item.date),
    authorized_date: item.authorized_date ? dateOnly(item.authorized_date) : null,
    name: item.name.slice(0, 500),
    merchant: (item.merchant_name ?? '').slice(0, 250),
    pending: item.pending,
    removed: false,
    suggested_category: (pfc?.detailed ?? '').slice(0, 150),
    flow: flow as Flow,
  };
}
function compatibleFlow(flow: Flow, amount: bigint) {
  return flow === 'transfer' || (flow === 'expense' ? amount >= 0n : amount <= 0n);
}

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  constructor(
    private readonly db: Database,
    private readonly plaid: PlaidClient,
    private readonly vault: TokenVault,
  ) {}
  request(bankId: string) {
    return this.db.bankConnection.update({
      where: { id: bankId },
      data: { sync_requested: { increment: 1 } },
    });
  }
  async fetch(token: string, originalCursor: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const added: ProviderTransaction[] = [],
        modified: ProviderTransaction[] = [],
        removed: { transaction_id: string }[] = [];
      let cursor = originalCursor;
      try {
        for (let n = 0; n < 200; n++) {
          const page = await this.plaid.sync(token, cursor);
          if (
            !Array.isArray(page.added) ||
            !Array.isArray(page.modified) ||
            !Array.isArray(page.removed) ||
            typeof page.next_cursor !== 'string' ||
            typeof page.has_more !== 'boolean'
          )
            throw new PlaidError('INVALID_PROVIDER_RESPONSE');
          added.push(...page.added);
          modified.push(...page.modified);
          removed.push(...page.removed);
          if (!page.has_more) return { ...page, added, modified, removed };
          if (cursor === page.next_cursor) throw new PlaidError('PAGINATION_STALLED');
          cursor = page.next_cursor;
        }
        throw new PlaidError('PAGINATION_LIMIT');
      } catch (error) {
        if (
          !(error instanceof PlaidError) ||
          error.code !== 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' ||
          attempt === 2
        )
          throw error;
      }
    }
    throw new PlaidError('SYNC_RETRY_EXHAUSTED');
  }
  private async apply(tx: Tx, bank: BankConnection, page: SyncPage, now: Date) {
    for (const item of [...page.added, ...page.modified]) {
      if (item.account_id !== bank.account_id) continue;
      const values = providerValues(item);
      let row = await tx.ledgerTransaction.findUnique({
        where: { bank_id_provider_id: { bank_id: bank.id, provider_id: item.transaction_id } },
      });
      if (row) {
        await lockTransaction(tx, row.id);
        row = await tx.ledgerTransaction.findUniqueOrThrow({ where: { id: row.id } });
        const manual = row.flow_manual && compatibleFlow(row.flow, values.amount_cents);
        if (manual) values.flow = row.flow;
        const changed = Object.entries(values).some(([k, v]) => {
          const old = row![k as keyof typeof values];
          return old instanceof Date && v instanceof Date
            ? old.getTime() !== v.getTime()
            : old !== v;
        });
        if (!changed) continue;
        const reviewChanged =
          row.amount_cents !== values.amount_cents ||
          row.name !== values.name ||
          row.flow !== values.flow;
        await tx.ledgerTransaction.update({
          where: { id: row.id },
          data: {
            ...values,
            flow_manual: manual,
            ...(values.flow === 'income'
              ? {
                  reviewed: true,
                  reviewed_at: row.flow === 'income' ? (row.reviewed_at ?? now) : now,
                  reviewed_by_id: null,
                }
              : reviewChanged
                ? { reviewed: false, reviewed_at: null, reviewed_by_id: null }
                : {}),
            ...(row.pending && !values.pending && bank.initial_sync_complete
              ? { notify_at: now }
              : {}),
            version: { increment: 1 },
            updated_at: now,
          },
        });
      } else {
        let old = item.pending_transaction_id
          ? await tx.ledgerTransaction.findUnique({
              where: {
                bank_id_provider_id: { bank_id: bank.id, provider_id: item.pending_transaction_id },
              },
              include: transactionInclude,
            })
          : null;
        if (old) {
          await lockTransaction(tx, old.id);
          old = await tx.ledgerTransaction.findUniqueOrThrow({
            where: { id: old.id },
            include: transactionInclude,
          });
        }
        const manual = old?.flow_manual && compatibleFlow(old.flow, values.amount_cents);
        const flow = manual ? old!.flow : values.flow;
        const reviewed =
          flow === 'income' ||
          (old?.flow !== 'income' &&
            old?.reviewed &&
            old.amount_cents === values.amount_cents &&
            old.name === values.name &&
            old.flow === flow);
        await tx.ledgerTransaction.create({
          data: {
            ...values,
            bank_id: bank.id,
            provider_id: item.transaction_id,
            flow,
            reviewed: !!reviewed,
            reviewed_at: reviewed ? (old?.reviewed_at ?? now) : null,
            reviewed_by_id: reviewed && flow !== 'income' ? old?.reviewed_by_id : null,
            ...(old
              ? {
                  category_id: old.category_id,
                  labels: {
                    create: transactionCategories(old).map((c) => ({ category_id: c.id })),
                  },
                  note: old.note,
                  flow_manual: !!manual,
                  first_seen_at: old.first_seen_at,
                }
              : {}),
            notify_at: !values.pending && bank.initial_sync_complete ? now : null,
            updated_at: now,
          },
        });
        if (old)
          await tx.ledgerTransaction.update({
            where: { id: old.id },
            data: { removed: true, version: { increment: 1 }, updated_at: now },
          });
      }
    }
    for (const item of page.removed)
      await tx.ledgerTransaction.updateMany({
        where: { bank_id: bank.id, provider_id: item.transaction_id, removed: false },
        data: { removed: true, version: { increment: 1 }, updated_at: now },
      });
    await tx.bankConnection.update({
      where: { id: bank.id },
      data: {
        cursor: page.next_cursor,
        initial_sync_complete:
          bank.initial_sync_complete ||
          page.transactions_update_status === 'HISTORICAL_UPDATE_COMPLETE',
        last_synced_at: now,
        state: 'connected',
        error_code: '',
        failures: 0,
        sync_completed: bank.sync_requested,
        next_attempt_at: now,
      },
    });
  }
  async run(bankId: string, force = false) {
    return this.db.$transaction(async (tx) => {
      const initial = await tx.bankConnection.findUniqueOrThrow({ where: { id: bankId } });
      await lockHome(tx, initial.household_id);
      await lockBank(tx, bankId);
      const bank = await tx.bankConnection.findUniqueOrThrow({ where: { id: bankId } });
      const now = new Date();
      if (bank.provider !== 'plaid' || !bank.account_id || bank.state === 'awaiting_account')
        return false;
      if (
        !force &&
        (bank.next_attempt_at > now ||
          (bank.sync_completed >= bank.sync_requested &&
            bank.last_synced_at &&
            bank.last_synced_at.getTime() > now.getTime() - 21600000))
      )
        return false;
      await tx.$executeRawUnsafe('SAVEPOINT bank_sync');
      try {
        const page = await this.fetch(
          this.vault.decrypt(bank.encrypted_access_token, bank.household_id),
          bank.cursor,
        );
        await this.apply(tx, bank, page, now);
        await tx.$executeRawUnsafe('RELEASE SAVEPOINT bank_sync');
        return true;
      } catch (error) {
        if (!(error instanceof PlaidError)) throw error;
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT bank_sync');
        await tx.$executeRawUnsafe('RELEASE SAVEPOINT bank_sync');
        const failures = bank.failures + 1;
        await tx.bankConnection.update({
          where: { id: bankId },
          data: {
            state: [
              'ITEM_LOGIN_REQUIRED',
              'ITEM_ACCESS_NOT_GRANTED',
              'ACCESS_NOT_GRANTED',
              'ITEM_NOT_FOUND',
            ].includes(error.code)
              ? 'reauth_required'
              : 'sync_error',
            error_code: error.code,
            failures,
            next_attempt_at: new Date(
              Date.now() + Math.min(21600000, 30000 * 2 ** Math.min(failures, 10)),
            ),
          },
        });
        this.log.warn(`Sync failed: connection=${bankId} code=${error.code}`);
        return false;
      }
    });
  }
  async runPending() {
    const rows = await this.db.bankConnection.findMany({
      where: {
        provider: 'plaid',
        next_attempt_at: { lte: new Date() },
        state: { not: 'awaiting_account' },
      },
    });
    let count = 0;
    for (const row of rows)
      if (
        row.sync_requested > row.sync_completed ||
        !row.last_synced_at ||
        row.last_synced_at.getTime() < Date.now() - 21600000
      )
        count += Number(await this.run(row.id));
    return count;
  }
}
