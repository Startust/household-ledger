import { useState } from 'react';
import { Check, ChevronDown, Mail } from 'lucide-react';
import { useResource } from './hooks';
import { api } from './api';
import { Empty, Notice, Skeleton } from './components';
import { dateText, money, timeText, type Digest, type Page } from './types';

export function Inbox({ revision, online }: { revision: number; online: boolean }) {
  const [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [open, setOpen] = useState<number | null>(null),
    [busy, setBusy] = useState<number | null>(null),
    [error, setError] = useState('');
  const resource = useResource<Page<Digest>>(`/api/digests?page=${page}`, revision + retry);
  async function mark(digest: Digest) {
    setBusy(digest.id);
    setError('');
    try {
      await api(`/api/digests/${digest.id}/read`, 'POST', {});
      resource.setData((old) =>
        old
          ? {
              ...old,
              results: old.results.map((d) => (d.id === digest.id ? { ...d, read: true } : d)),
            }
          : old,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Updates</h1>
        </div>
        <Mail className="page-symbol" size={33} strokeWidth={1.4} />
      </header>
      {error && <Notice>{error}</Notice>}
      {resource.error ? (
        <Notice>
          {resource.error}
          <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </Notice>
      ) : resource.loading ? (
        <Skeleton />
      ) : resource.data?.count ? (
        <>
          <div className="digest-list">
            {resource.data.results.map((d) => (
              <article className={`digest ${d.read ? 'read' : ''}`} key={d.id}>
                <button
                  className="digest-heading"
                  aria-expanded={open === d.id}
                  onClick={() => setOpen(open === d.id ? null : d.id)}
                >
                  <span className={`read-dot ${d.read ? 'read' : ''}`} />
                  <span>
                    <h2>{dateText(d.local_date)}</h2>
                    <p>
                      {d.new_count} new · {d.unreviewed_count} to review
                    </p>
                  </span>
                  <strong>
                    {money(d.expense_cents)}
                    <small>new net spending</small>
                  </strong>
                  <ChevronDown size={18} className={open === d.id ? 'rotated' : ''} />
                </button>
                {open === d.id && (
                  <div className="digest-detail">
                    {d.snapshot.transactions.length ? (
                      d.snapshot.transactions.map((t) => (
                        <div className="digest-transaction" key={t.id}>
                          <span>{t.name}</span>
                          <strong>
                            {t.amount_cents < 0 ? '+' : '−'}
                            {money(Math.abs(t.amount_cents))}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p>No newly posted transactions in this summary.</p>
                    )}
                    <p className="helper">
                      Bank status at summary:{' '}
                      {(
                        {
                          connected: 'Connected',
                          reauth_required: 'Reconnection needed',
                          sync_error: 'Sync needs attention',
                          not_connected: 'Not connected',
                        } as Record<string, string>
                      )[d.snapshot.bank_state] ?? d.snapshot.bank_state}{' '}
                      · Last sync {timeText(d.snapshot.last_synced_at)}
                    </p>
                  </div>
                )}
                <div className="digest-footer">
                  <span>{d.read ? 'Read' : 'Unread'}</span>
                  <button
                    className="text-button"
                    disabled={d.read || busy === d.id || !online}
                    onClick={() => mark(d)}
                  >
                    <Check size={15} />
                    {d.read ? 'Read' : busy === d.id ? 'Marking…' : 'Mark as read'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {(resource.data.previous || resource.data.next) && (
            <nav className="pagination" aria-label="Summary pages">
              <button
                className="button secondary"
                disabled={!resource.data.previous}
                onClick={() => setPage((n) => n - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button secondary"
                disabled={!resource.data.next}
                onClick={() => setPage((n) => n + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <Empty title="No updates yet">Set a daily summary time in Settings.</Empty>
      )}
    </>
  );
}
