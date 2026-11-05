import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Database, lockHome, lockTransaction } from './database.js';
import { Prisma } from './generated/prisma/client.js';
import type { Principal } from './auth.js';
import type {
  CategoryPatchDto,
  HouseholdPatchDto,
  TransactionPatchDto,
  TransactionQuery,
} from './dto.js';

export const transactionInclude = {
  category: true,
  reviewed_by: { select: { username: true } },
} as const;
export type FullTransaction = Prisma.LedgerTransactionGetPayload<{
  include: typeof transactionInclude;
}>;
export function transactionWhere(
  user: Principal,
  query: Omit<TransactionQuery, 'page'>,
): Prisma.LedgerTransactionWhereInput {
  let date: { gte: Date; lt: Date } | undefined;
  if (query.month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month))
      throw new BadRequestException('Use YYYY-MM for month.');
    const start = new Date(query.month + '-01T00:00:00Z');
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    date = { gte: start, lt: end };
  }
  return {
    bank: { household_id: user.household_id },
    removed: false,
    ...(date ? { date } : {}),
    ...(query.pending ? { pending: query.pending === 'true' } : {}),
    ...(query.reviewed ? { reviewed: query.reviewed === 'true' } : {}),
    ...(query.uncategorized === 'true'
      ? { category_id: null }
      : query.uncategorized === 'false'
        ? { category_id: { not: null } }
        : {}),
    ...(query.search
      ? {
          OR: ['name', 'merchant', 'note'].map((field) => ({
            [field]: { contains: query.search, mode: 'insensitive' },
          })),
        }
      : {}),
  };
}
export function transactionJson(row: FullTransaction) {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    authorized_date: row.authorized_date?.toISOString().slice(0, 10) ?? null,
    name: row.name,
    merchant: row.merchant,
    amount_cents: Number(row.amount_cents),
    currency: row.currency,
    pending: row.pending,
    removed: row.removed,
    suggested_category: row.suggested_category,
    category: row.category_id,
    category_name: row.category?.name ?? null,
    flow: row.flow,
    reviewed: row.reviewed,
    reviewed_by_name: row.reviewed_by?.username ?? null,
    reviewed_at: row.reviewed_at,
    note: row.note,
    version: row.version,
    updated_at: row.updated_at,
  };
}

export function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (name: string) => parts.find((p) => p.type === name)!.value;
  const text = `${get('year')}-${get('month')}-${get('day')}`;
  return { text, date: new Date(`${text}T00:00:00Z`), hour: Number(get('hour')) };
}
function categoryName(value: string) {
  const name = value.trim();
  if (!name) throw new BadRequestException('Enter a category name.');
  return name;
}

@Injectable()
export class LedgerService {
  constructor(private readonly db: Database) {}
  async household(user: Principal) {
    const home = await this.db.household.findUniqueOrThrow({
      where: { id: user.household_id },
      include: { users: { select: { username: true } } },
    });
    const { users, created_at, ...data } = home;
    return { ...data, members: users.map((u) => u.username), username: user.username };
  }
  updateHousehold(user: Principal, patch: HouseholdPatchDto) {
    if (patch.name !== undefined && !patch.name.trim())
      throw new BadRequestException('Enter a name.');
    return this.db.household.update({ where: { id: user.household_id }, data: patch });
  }
  async categories(user: Principal) {
    const rows = await this.db.category.findMany({
      where: { household_id: user.household_id },
      orderBy: { id: 'asc' },
    });
    return {
      count: rows.length,
      next: null,
      previous: null,
      results: rows.map(({ household_id, ...row }) => row),
    };
  }
  async category(user: Principal, id: number) {
    const row = await this.db.category.findFirst({
      where: { id, household_id: user.household_id },
    });
    if (!row) throw new NotFoundException();
    const { household_id, ...data } = row;
    return data;
  }
  async createCategory(user: Principal, name: string) {
    const row = await this.db.category.create({
      data: { household_id: user.household_id, name: categoryName(name) },
    });
    return { id: row.id, name: row.name, active: row.active };
  }
  async updateCategory(user: Principal, id: number, patch: CategoryPatchDto) {
    await this.category(user, id);
    await this.db.category.update({
      where: { id },
      data: { ...patch, ...(patch.name !== undefined ? { name: categoryName(patch.name) } : {}) },
    });
    return this.category(user, id);
  }
  async transactions(user: Principal, query: TransactionQuery) {
    const where = transactionWhere(user, query);
    const page = query.page ?? 1;
    const [count, rows] = await this.db.$transaction([
      this.db.ledgerTransaction.count({ where }),
      this.db.ledgerTransaction.findMany({
        where,
        include: transactionInclude,
        orderBy: [{ date: 'desc' }, { first_seen_at: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * 50,
        take: 50,
      }),
    ]);
    const link = (p: number) =>
      '/api/transactions?' +
      new URLSearchParams(
        Object.fromEntries(Object.entries({ ...query, page: p }).map(([k, v]) => [k, String(v)])),
      ).toString();
    return {
      count,
      next: page * 50 < count ? link(page + 1) : null,
      previous: page > 1 ? link(page - 1) : null,
      results: rows.map(transactionJson),
    };
  }
  async transaction(user: Principal, id: string) {
    const row = await this.db.ledgerTransaction.findFirst({
      where: { id, bank: { household_id: user.household_id } },
      include: transactionInclude,
    });
    if (!row) throw new NotFoundException();
    return transactionJson(row);
  }
  async edit(user: Principal, id: string, input: TransactionPatchDto) {
    if (Object.keys(input).filter((k) => k !== 'version').length === 0)
      throw new BadRequestException('Change at least one field.');
    return this.db.$transaction(async (tx) => {
      // Check scope before taking a lock on a supplied UUID.
      if (
        !(await tx.ledgerTransaction.findFirst({
          where: { id, bank: { household_id: user.household_id } },
        }))
      )
        throw new NotFoundException();
      await lockTransaction(tx, id);
      const row = await tx.ledgerTransaction.findUniqueOrThrow({ where: { id } });
      if (row.version !== input.version || row.removed)
        throw new ConflictException('This transaction changed or was removed. Reload it.');
      if (
        input.category != null &&
        !(await tx.category.findFirst({
          where: { id: input.category, household_id: user.household_id, active: true },
        }))
      )
        throw new BadRequestException('This category is unavailable or archived.');
      const flow = input.flow ?? row.flow;
      if (
        (flow === 'expense' && row.amount_cents < 0n) ||
        (['refund', 'income'].includes(flow) && row.amount_cents > 0n)
      )
        throw new BadRequestException(
          'Expenses must be debits; income and refunds must be credits.',
        );
      const data: Prisma.LedgerTransactionUncheckedUpdateInput = {
        version: { increment: 1 },
        updated_at: new Date(),
      };
      const changes: Record<string, { before: unknown; after: unknown }> = {};
      for (const key of ['category', 'flow', 'reviewed', 'note'] as const) {
        if (input[key] !== undefined) {
          const field = key === 'category' ? 'category_id' : key;
          if (row[field] !== input[key]) changes[key] = { before: row[field], after: input[key] };
          Object.assign(data, { [field]: input[key] });
        }
      }
      if (input.flow !== undefined) data.flow_manual = true;
      if (input.reviewed !== undefined) {
        data.reviewed_by_id = input.reviewed ? user.id : null;
        data.reviewed_at = input.reviewed ? new Date() : null;
      }
      const updated = await tx.ledgerTransaction.update({
        where: { id },
        data,
        include: transactionInclude,
      });
      await tx.transactionEdit.create({
        data: { transaction_id: id, actor_id: user.id, changes: changes as Prisma.InputJsonValue },
      });
      return transactionJson(updated);
    });
  }
  async history(user: Principal, id: string) {
    await this.transaction(user, id);
    const rows = await this.db.transactionEdit.findMany({
      where: { transaction_id: id },
      include: { actor: { select: { username: true } } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map((r) => ({
      actor: r.actor?.username ?? null,
      changes: r.changes,
      created_at: r.created_at,
    }));
  }
  async summary(user: Principal, requestedMonth?: string) {
    const home = await this.db.household.findUniqueOrThrow({ where: { id: user.household_id } });
    const month = requestedMonth ?? localClock(new Date(), home.timezone).text.slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new BadRequestException('Use YYYY-MM for month.');
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const rows = await this.db.ledgerTransaction.findMany({
      where: {
        bank: { household_id: home.id },
        pending: false,
        removed: false,
        date: { gte: start, lt: end },
      },
      include: { category: true },
    });
    let expense = 0n,
      refund = 0n,
      income = 0n,
      transfers = 0;
    const groups = new Map<
      number | null,
      { category_id: number | null; name: string; net_spend_cents: bigint }
    >();
    for (const row of rows) {
      if (row.flow === 'transfer') {
        transfers++;
        continue;
      }
      if (row.flow === 'income') {
        income -= row.amount_cents;
        continue;
      }
      if (row.flow === 'refund') refund -= row.amount_cents;
      else expense += row.amount_cents;
      const group = groups.get(row.category_id) ?? {
        category_id: row.category_id,
        name: row.category?.name ?? 'Uncategorized',
        net_spend_cents: 0n,
      };
      group.net_spend_cents += row.amount_cents;
      groups.set(row.category_id, group);
    }
    const unreviewed = await this.db.ledgerTransaction.count({
      where: { bank: { household_id: home.id }, pending: false, removed: false, reviewed: false },
    });
    return {
      month,
      currency: 'USD',
      expense_cents: expense,
      refund_cents: refund,
      income_cents: income,
      transfer_count: transfers,
      net_spend_cents: expense - refund,
      categories: [...groups.values()],
      settled_only: true,
      unreviewed_count: unreviewed,
    };
  }
}

@Injectable()
export class DigestService {
  constructor(private readonly db: Database) {}
  async generate(householdId: string, instant?: Date, force = false) {
    return this.db.$transaction(async (tx) => {
      await lockHome(tx, householdId);
      const now = instant ?? new Date();
      const home = await tx.household.findUniqueOrThrow({
        where: { id: householdId },
        include: { bank: true },
      });
      const local = localClock(now, home.timezone);
      if (!home.digest_enabled || (!force && local.hour < home.digest_hour)) return null;
      const existing = await tx.dailyDigest.findUnique({
        where: { household_id_local_date: { household_id: householdId, local_date: local.date } },
      });
      if (existing) return existing;
      const previous = await tx.dailyDigest.findFirst({
        where: { household_id: householdId },
        orderBy: { window_end: 'desc' },
      });
      const start = previous?.window_end ?? home.created_at;
      const where = { bank: { household_id: householdId }, pending: false, removed: false };
      const rows = await tx.ledgerTransaction.findMany({
        where: { ...where, notify_at: { gt: start, lte: now } },
      });
      const unreviewed = await tx.ledgerTransaction.count({ where: { ...where, reviewed: false } });
      return tx.dailyDigest.create({
        data: {
          household_id: householdId,
          local_date: local.date,
          window_start: start,
          window_end: now,
          new_count: rows.length,
          expense_cents: rows
            .filter((r) => ['expense', 'refund'].includes(r.flow))
            .reduce((n, r) => n + r.amount_cents, 0n),
          unreviewed_count: unreviewed,
          snapshot: {
            title: `${rows.length} new posted transactions`,
            currency: 'USD',
            channel: 'inbox',
            bank_state: home.bank?.state ?? 'not_connected',
            last_synced_at: home.bank?.last_synced_at?.toISOString() ?? null,
            transactions: rows.map((r) => ({
              id: r.id,
              name: r.name,
              amount_cents: Number(r.amount_cents),
              flow: r.flow,
              reviewed: r.reviewed,
            })),
          },
        },
      });
    });
  }
  async list(user: Principal, page = 1) {
    const where = { household_id: user.household_id };
    const [count, rows] = await this.db.$transaction([
      this.db.dailyDigest.count({ where }),
      this.db.dailyDigest.findMany({
        where,
        include: { reads: { where: { user_id: user.id } } },
        orderBy: { local_date: 'desc' },
        skip: (page - 1) * 50,
        take: 50,
      }),
    ]);
    return {
      count,
      next: page * 50 < count ? `/api/digests?page=${page + 1}` : null,
      previous: page > 1 ? `/api/digests?page=${page - 1}` : null,
      results: rows.map(({ reads, household_id, ...row }) => ({ ...row, read: reads.length > 0 })),
    };
  }
  async get(user: Principal, id: number) {
    const row = await this.db.dailyDigest.findFirst({
      where: { id, household_id: user.household_id },
      include: { reads: { where: { user_id: user.id } } },
    });
    if (!row) throw new NotFoundException();
    const { reads, household_id, ...data } = row;
    return { ...data, read: reads.length > 0 };
  }
  async markRead(user: Principal, id: number) {
    await this.get(user, id);
    await this.db.digestRead.upsert({
      where: { digest_id_user_id: { digest_id: id, user_id: user.id } },
      create: { digest_id: id, user_id: user.id },
      update: {},
    });
    return { read: true };
  }
}
