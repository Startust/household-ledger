import { useEffect, useRef, useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { api } from './api';
import { Notice } from './components';
import { timeText, type Account, type Bank } from './types';

type LinkResult = { link_token: string; expiration: string; update_mode: boolean };
type PlaidHandler = { open: () => void; destroy: () => void };
declare global {
  interface Window {
    Plaid?: {
      create: (options: {
        token: string;
        receivedRedirectUri?: string;
        onSuccess: (token: string, metadata: { accounts: { id: string }[] }) => void;
        onExit: (error: unknown) => void;
        onLoad: () => void;
      }) => PlaidHandler;
    };
  }
}
let scriptRequest: Promise<void> | undefined;
function loadPlaid() {
  if (window.Plaid) return Promise.resolve();
  if (!scriptRequest)
    scriptRequest = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        scriptRequest = undefined;
        reject(new Error('The bank authorization page could not open. Please try again.'));
      };
      document.head.append(script);
    });
  return scriptRequest;
}
export function BankPanel({
  bank,
  refresh,
  online,
}: {
  bank: Bank;
  refresh: () => void;
  online: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [accounts, setAccounts] = useState<Account[] | null>(null),
    [selected, setSelected] = useState('');
  const handler = useRef<PlaidHandler | null>(null),
    resumed = useRef(false);
  useEffect(
    () => () => {
      handler.current?.destroy();
    },
    [],
  );
  async function chooseAccounts() {
    const list = await api<Account[]>('/api/bank/accounts');
    setAccounts(list);
    setSelected(list.length === 1 ? list[0].account_id : '');
  }
  async function launch(saved?: LinkResult) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const link = saved ?? (await api<LinkResult>('/api/bank/link-token', 'POST', {}));
      sessionStorage.setItem('ledger-plaid-link', JSON.stringify(link));
      await loadPlaid();
      let instance: PlaidHandler;
      instance = window.Plaid!.create({
        token: link.link_token,
        ...(saved ? { receivedRedirectUri: window.location.href } : {}),
        onLoad: () => {
          instance.open();
        },
        onSuccess: async (publicToken, metadata) => {
          sessionStorage.removeItem('ledger-plaid-link');
          if (saved) window.history.replaceState(null, '', '/#settings');
          try {
            if (link.update_mode && bank.state !== 'awaiting_account')
              await api('/api/bank/reauth-complete', 'POST', {});
            else if (link.update_mode) await chooseAccounts();
            else {
              const result = await api<Bank>('/api/bank/exchange', 'POST', {
                public_token: publicToken,
                ...(metadata.accounts.length === 1 ? { account_id: metadata.accounts[0].id } : {}),
              });
              if (result.state === 'awaiting_account') await chooseAccounts();
            }
            setMessage(
              'Bank authorization saved. Transactions will sync after you select an account.',
            );
            refresh();
          } catch (e) {
            setError((e as Error).message);
            refresh();
          } finally {
            setBusy(false);
          }
        },
        onExit: (error) => {
          setBusy(false);
          if (error) setError('Bank authorization was not completed. You can try again later.');
          sessionStorage.removeItem('ledger-plaid-link');
          if (saved) window.history.replaceState(null, '', '/#settings');
        },
      });
      handler.current?.destroy();
      handler.current = instance;
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (resumed.current || !new URLSearchParams(window.location.search).has('oauth_state_id'))
      return;
    resumed.current = true;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('ledger-plaid-link') ?? 'null',
      ) as LinkResult | null;
      if (!saved || Date.parse(saved.expiration) < Date.now())
        throw new Error('This bank session has expired. Please connect again.');
      void launch(saved);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  async function sync() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/bank/sync', 'POST', {});
      setMessage('Sync requested. New transactions will appear when they are ready.');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function select() {
    setBusy(true);
    setError('');
    try {
      await api('/api/bank/select-account', 'POST', { account_id: selected });
      setAccounts(null);
      setMessage('Account selected. Waiting for the first sync.');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const label =
    bank.provider === 'demo'
      ? 'Sample account'
      : ((
          {
            not_connected: 'Not connected',
            awaiting_account: 'Choose an account',
            reauth_required: 'Reconnection needed',
            sync_error: 'Sync needs attention',
            connected: 'Connected',
          } as Record<string, string>
        )[bank.state] ?? 'Waiting to sync');
  return (
    <section className="settings-section">
      <h2>Bank account</h2>
      <div className="bank-summary">
        <span className="bank-symbol">
          <Landmark size={27} strokeWidth={1.5} />
        </span>
        <div>
          <strong>{bank.account_name || 'Connect your checking account'}</strong>
          <p>
            {bank.mask ? `••${bank.mask} · USD · ` : ''}
            {label}
          </p>
        </div>
      </div>
      <p className="helper">
        {bank.provider === 'demo'
          ? 'Sample data. No bank connected.'
          : bank.id
            ? `Last sync: ${timeText(bank.last_synced_at)}. USD checking account.`
            : 'Connect through your bank authorization page. Never enter your bank password in this app.'}
      </p>
      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      {bank.provider !== 'demo' && (
        <div className="button-row">
          {bank.state === 'not_connected' || bank.state === 'reauth_required' ? (
            <button className="button primary" disabled={busy || !online} onClick={() => launch()}>
              {busy
                ? 'Preparing…'
                : bank.state === 'reauth_required'
                  ? 'Reconnect bank'
                  : 'Connect bank'}
            </button>
          ) : bank.state === 'awaiting_account' ? (
            <button
              className="button secondary"
              disabled={busy || !online}
              onClick={async () => {
                setBusy(true);
                try {
                  await chooseAccounts();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Choose checking account
            </button>
          ) : (
            <button className="button secondary" disabled={busy || !online} onClick={sync}>
              <RefreshCw size={16} />
              {busy ? 'Requesting…' : 'Sync transactions'}
            </button>
          )}
        </div>
      )}
      {accounts && (
        <div className="account-choice">
          {accounts.length ? (
            <>
              <label>
                Choose your shared account
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name} · {a.mask || 'No account digits'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button primary"
                disabled={!selected || busy || !online}
                onClick={select}
              >
                Use this account
              </button>
            </>
          ) : (
            <Notice>
              No USD checking account is available in this connection. Check your bank
              authorization.
            </Notice>
          )}
        </div>
      )}
    </section>
  );
}
