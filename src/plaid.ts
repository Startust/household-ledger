import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';
import { Config } from './config.js';

export class PlaidError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(/^[A-Z0-9_]{1,100}$/.test(code) ? code : 'PROVIDER_ERROR');
    this.code = this.message;
  }
}
export interface ProviderTransaction {
  transaction_id: string;
  account_id: string;
  amount: number | string;
  iso_currency_code: string;
  date: string;
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  pending_transaction_id?: string | null;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
}
export interface SyncPage {
  added: ProviderTransaction[];
  modified: ProviderTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
  transactions_update_status?: string;
}
export interface ProviderAccount {
  account_id: string;
  name: string;
  mask?: string | null;
  type: string;
  subtype: string;
  balances: { iso_currency_code: string };
}

@Injectable()
export class TokenVault {
  constructor(private readonly config: Config) {}
  encrypt(token: string, householdId: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.config.values.bankKey, nonce);
    cipher.setAAD(Buffer.from(householdId));
    const bytes = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [
      'v1',
      nonce.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      bytes.toString('base64url'),
    ].join('.');
  }
  decrypt(value: string, householdId: string) {
    try {
      const [version, nonce, tag, bytes] = value.split('.');
      if (version !== 'v1') throw new Error('Version');
      const cipher = createDecipheriv(
        'aes-256-gcm',
        this.config.values.bankKey,
        Buffer.from(nonce, 'base64url'),
      );
      cipher.setAuthTag(Buffer.from(tag, 'base64url'));
      cipher.setAAD(Buffer.from(householdId));
      return Buffer.concat([
        cipher.update(Buffer.from(bytes, 'base64url')),
        cipher.final(),
      ]).toString('utf8');
    } catch {
      throw new PlaidError('TOKEN_DECRYPTION_FAILED');
    }
  }
}

@Injectable()
export class PlaidClient {
  private keys = new Map<string, { jwk: JWK & { expired_at?: number | null }; until: number }>();
  constructor(private readonly config: Config) {}
  async call<T>(path: string, payload: Record<string, unknown> = {}): Promise<T> {
    const config = this.config.values;
    if (!config.plaidClientId || !config.plaidSecret) throw new PlaidError('PLAID_NOT_CONFIGURED');
    try {
      const response = await fetch(`https://${config.plaidEnv}.plaid.com${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Plaid-Version': '2020-09-14' },
        body: JSON.stringify({
          client_id: config.plaidClientId,
          secret: config.plaidSecret,
          ...payload,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const body = (await response.json()) as Record<string, unknown>;
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new PlaidError('INVALID_PROVIDER_RESPONSE');
      if (!response.ok) throw new PlaidError(String(body.error_code ?? 'PROVIDER_ERROR'));
      return body as T;
    } catch (error) {
      if (error instanceof PlaidError) throw error;
      throw new PlaidError('PROVIDER_UNAVAILABLE');
    }
  }
  sync(token: string, cursor: string) {
    return this.call<SyncPage>('/transactions/sync', {
      access_token: token,
      count: 500,
      ...(cursor ? { cursor } : {}),
    });
  }
  async verifyWebhook(body: Buffer, token: string) {
    let header;
    try {
      header = decodeProtectedHeader(token);
    } catch {
      return false;
    }
    if (header.alg !== 'ES256' || typeof header.kid !== 'string' || header.kid.length > 150)
      return false;
    let cached = this.keys.get(header.kid);
    if (!cached || cached.until < Date.now()) {
      const response = await this.call<{ key: JWK & { expired_at?: number | null } }>(
        '/webhook_verification_key/get',
        { key_id: header.kid },
      );
      cached = { jwk: response.key, until: Date.now() + 300000 };
      if (this.keys.size >= 10) this.keys.clear();
      this.keys.set(header.kid, cached);
    }
    const jwk = cached.jwk;
    if (jwk.alg !== 'ES256' || jwk.kid !== header.kid || jwk.expired_at != null) return false;
    try {
      const key = await importJWK(jwk, 'ES256');
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['ES256'],
        maxTokenAge: '5m',
        requiredClaims: ['iat', 'request_body_sha256'],
      });
      if (typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000) return false;
      if (
        typeof payload.request_body_sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/.test(payload.request_body_sha256)
      )
        return false;
      return timingSafeEqual(
        createHash('sha256').update(body).digest(),
        Buffer.from(payload.request_body_sha256, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
