import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Config } from './config.js';
import { Database, lockBank, lockHome } from './database.js';
import { PlaidClient, TokenVault, type ProviderAccount } from './plaid.js';
import { SyncService } from './sync.js';
import type { BankConnection } from './generated/prisma/client.js';

export function bankJson(bank: BankConnection) {
  const {
    id,
    provider,
    account_name,
    mask,
    state,
    error_code,
    initial_sync_complete,
    last_synced_at,
    next_attempt_at,
    connected_at,
    sync_requested,
    sync_completed,
  } = bank;
  return {
    id,
    provider,
    account_name,
    mask,
    state,
    error_code,
    initial_sync_complete,
    last_synced_at,
    next_attempt_at,
    connected_at,
    sync_requested,
    sync_completed,
  };
}
const eligible = (account: ProviderAccount) =>
  account.type === 'depository' &&
  account.subtype === 'checking' &&
  account.balances?.iso_currency_code === 'USD';

@Injectable()
export class BankService {
  constructor(
    private readonly db: Database,
    private readonly plaid: PlaidClient,
    private readonly vault: TokenVault,
    private readonly sync: SyncService,
    private readonly config: Config,
  ) {}
  async get(householdId: string) {
    const bank = await this.db.bankConnection.findUnique({ where: { household_id: householdId } });
    return bank ? bankJson(bank) : { state: 'not_connected' };
  }
  private async connected(householdId: string) {
    const bank = await this.db.bankConnection.findUnique({ where: { household_id: householdId } });
    if (!bank || bank.provider !== 'plaid')
      throw new NotFoundException('No Plaid connection found.');
    return bank;
  }
  async linkToken(householdId: string) {
    const bank = await this.db.bankConnection.findUnique({ where: { household_id: householdId } });
    if (bank?.provider === 'demo')
      throw new ConflictException(
        'Demo ledgers cannot connect to a bank. Create a separate ledger.',
      );
    const payload: Record<string, unknown> = {
      user: { client_user_id: householdId },
      client_name: 'Home Ledger',
      country_codes: ['US'],
      language: 'en',
    };
    if (bank) payload.access_token = this.vault.decrypt(bank.encrypted_access_token, householdId);
    else
      Object.assign(payload, {
        products: ['transactions'],
        transactions: { days_requested: 90 },
        account_filters: { depository: { account_subtypes: ['checking'] } },
      });
    if (this.config.values.webhookUrl) payload.webhook = this.config.values.webhookUrl;
    if (this.config.values.redirectUri) payload.redirect_uri = this.config.values.redirectUri;
    const result = await this.plaid.call<{ link_token: string; expiration: string }>(
      '/link/token/create',
      payload,
    );
    return { link_token: result.link_token, expiration: result.expiration, update_mode: !!bank };
  }
  async exchange(householdId: string, publicToken: string, accountId?: string) {
    const bank = await this.db.$transaction(async (tx) => {
      await lockHome(tx, householdId);
      if (await tx.bankConnection.findUnique({ where: { household_id: householdId } }))
        throw new ConflictException(
          'A bank connection already exists. Reconnect the existing account.',
        );
      const result = await this.plaid.call<{ item_id: string; access_token: string }>(
        '/item/public_token/exchange',
        { public_token: publicToken },
      );
      return tx.bankConnection.create({
        data: {
          household_id: householdId,
          item_id: result.item_id,
          encrypted_access_token: this.vault.encrypt(result.access_token, householdId),
          account_name: 'Choose account',
          state: 'awaiting_account',
        },
      });
    });
    // Separate commit: keep the token when account selection/network validation fails.
    return accountId ? this.selectAccount(householdId, accountId) : bankJson(bank);
  }
  private accountsRaw(bank: BankConnection) {
    return this.plaid.call<{
      accounts: ProviderAccount[];
      item?: { institution_id?: string | null };
    }>('/accounts/get', {
      access_token: this.vault.decrypt(bank.encrypted_access_token, bank.household_id),
    });
  }
  async accounts(householdId: string) {
    const bank = await this.connected(householdId);
    const result = await this.accountsRaw(bank);
    return result.accounts
      .filter(eligible)
      .map(({ account_id, name, mask }) => ({ account_id, name, mask: mask ?? null }));
  }
  async selectAccount(householdId: string, accountId: string) {
    const initial = await this.connected(householdId);
    const result = await this.accountsRaw(initial);
    const selected = result.accounts.find((a) => a.account_id === accountId && eligible(a));
    if (!selected)
      throw new BadRequestException('Select a USD checking account from this connection.');
    return this.db.$transaction(async (tx) => {
      await lockBank(tx, initial.id);
      const bank = await tx.bankConnection.findUniqueOrThrow({ where: { id: initial.id } });
      if (bank.account_id && bank.account_id !== accountId)
        throw new ConflictException('This household already has a selected account.');
      if (bank.account_id) return bankJson(bank);
      return bankJson(
        await tx.bankConnection.update({
          where: { id: bank.id },
          data: {
            account_id: accountId,
            account_name: selected.name.slice(0, 150),
            mask: (selected.mask ?? '').slice(0, 8),
            institution_id: result.item?.institution_id ?? '',
            state: 'connected',
          },
        }),
      );
    });
  }
  async requestSync(householdId: string) {
    const bank = await this.connected(householdId);
    if (!bank.account_id) throw new ConflictException('Choose an account first.');
    await this.sync.request(bank.id);
    return { detail: 'Sync queued.' };
  }
  async reauth(householdId: string) {
    const bank = await this.connected(householdId);
    const result = await this.accountsRaw(bank);
    if (!result.accounts.some((a) => a.account_id === bank.account_id && eligible(a)))
      throw new ConflictException(
        'The original checking account is missing from this authorization.',
      );
    await this.db.bankConnection.update({
      where: { id: bank.id },
      data: { next_attempt_at: new Date(), sync_requested: { increment: 1 } },
    });
    return { detail: 'Bank reconnected. Sync queued.' };
  }
}
