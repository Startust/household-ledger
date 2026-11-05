export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type User = { id: string; username: string; household_id: string };
export type Household = {
  id: string;
  name: string;
  username: string;
  members: string[];
  timezone: string;
  digest_hour: number;
  digest_enabled: boolean;
};
export type Category = { id: number; name: string; active: boolean };
export type Flow = 'expense' | 'income' | 'transfer' | 'refund';
export type Transaction = {
  id: string;
  date: string;
  authorized_date: string | null;
  name: string;
  merchant: string;
  amount_cents: number;
  currency: string;
  pending: boolean;
  removed: boolean;
  suggested_category: string;
  category: number | null;
  category_name: string | null;
  categories: Category[];
  flow: Flow;
  reviewed: boolean;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  note: string;
  version: number;
  updated_at: string;
};
export type Summary = {
  month: string;
  currency: string;
  expense_cents: number;
  refund_cents: number;
  income_cents: number;
  net_spend_cents: number;
  transfer_count: number;
  unreviewed_count: number;
  categories: { category_id: number | null; name: string; net_spend_cents: number }[];
};
export type Bank = {
  id?: string;
  provider?: string;
  account_name?: string;
  mask?: string;
  state: string;
  error_code?: string;
  initial_sync_complete?: boolean;
  last_synced_at?: string | null;
  sync_requested?: number;
  sync_completed?: number;
};
export type Digest = {
  id: number;
  local_date: string;
  new_count: number;
  expense_cents: number;
  unreviewed_count: number;
  read: boolean;
  snapshot: {
    title: string;
    bank_state: string;
    last_synced_at: string | null;
    transactions: {
      id: string;
      name: string;
      amount_cents: number;
      flow: Flow;
      reviewed: boolean;
    }[];
  };
};
export type Edit = {
  actor: string;
  created_at: string;
  changes: Record<string, { before: unknown; after: unknown }>;
};
export type Account = { account_id: string; name: string; mask: string | null };
export const flowNames: Record<Flow, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  refund: 'Refund',
};
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const dateText = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(value.slice(0, 10) + 'T12:00:00Z'),
  );
export const timeText = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Not synced';
