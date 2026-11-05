import { ArrowRight, CheckCheck, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useResource } from './hooks';
import {
  Measurement,
  MeasurementGrid,
  MeasurementLabel,
  MeasurementValue,
} from './hoshikuzu/measurement';
import { StarPanel } from './hoshikuzu/star-panel';
import { ExportMenu } from './ExportMenu';
import { Empty, HelpTip, Notice, Skeleton, TransactionRows } from './components';
import { money, timeText, type Bank, type Page, type Summary, type Transaction } from './types';

export function Overview({
  month,
  setMonth,
  revision,
  bank,
  onSelect,
  navigate,
  refresh,
}: {
  month: string;
  setMonth: (m: string) => void;
  revision: number;
  bank: Bank;
  onSelect: (row: Transaction) => void;
  navigate: (page: string) => void;
  refresh: () => void;
}) {
  const summary = useResource<Summary>(`/api/summary?month=${month}`, revision);
  const recent = useResource<Page<Transaction>>('/api/transactions', revision);
  function moveMonth(step: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + step);
    setMonth(date.toISOString().slice(0, 7));
  }
  const groups =
    summary.data?.categories
      .slice()
      .sort((a, b) => Math.abs(b.net_spend_cents) - Math.abs(a.net_spend_cents)) ?? [];
  const largest = Math.max(...groups.map((g) => Math.abs(g.net_spend_cents)), 1);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Overview</h1>
        </div>
        <div className="heading-actions">
          <div className="month-control">
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="sr-only" htmlFor="overview-month">
              Statement month
            </label>
            <span className="month-picker">
              <span aria-hidden="true">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(month + '-01T12:00:00Z'))}
              </span>
              <input
                id="overview-month"
                type="month"
                value={month}
                min="2000-01"
                max="2100-12"
                onChange={(e) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value);
                }}
              />
            </span>
            <button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <ExportMenu
            params={new URLSearchParams({ month })}
            scope={new Intl.DateTimeFormat('en-US', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(month + '-01T00:00:00Z'))}
            disabled={summary.loading || !!summary.error}
          />
        </div>
      </header>
      {summary.error && (
        <Notice>
          {summary.error}
          <button className="text-button" onClick={refresh}>
            Try again
          </button>
        </Notice>
      )}
      {summary.loading ? (
        <Skeleton />
      ) : (
        summary.data && (
          <div className="overview-top">
            <section className="monthly-folio" aria-label="Monthly summary">
              <div className="folio-heading">
                <h2>Net spending</h2>
                <span>USD</span>
              </div>
              <div className="spending-line">
                <span className="spending-number">{money(summary.data.net_spend_cents)}</span>
                <HelpTip>
                  Spending minus refunds, by bank posting date. Pending transactions and transfers
                  are excluded.
                </HelpTip>
              </div>
              <p className="folio-note">Posted transactions</p>
              <MeasurementGrid className="ledger-measurements">
                <Measurement>
                  <MeasurementLabel>Income</MeasurementLabel>
                  <MeasurementValue>{money(summary.data.income_cents)}</MeasurementValue>
                </Measurement>
                <Measurement>
                  <MeasurementLabel>Spending</MeasurementLabel>
                  <MeasurementValue>{money(summary.data.expense_cents)}</MeasurementValue>
                </Measurement>
                <Measurement>
                  <MeasurementLabel>Refunds</MeasurementLabel>
                  <MeasurementValue>{money(summary.data.refund_cents)}</MeasurementValue>
                </Measurement>
              </MeasurementGrid>
            </section>
            <StarPanel className="review-note">
              <span className="review-symbol">
                <CheckCheck size={28} strokeWidth={1.5} />
              </span>
              <h2>
                {summary.data.unreviewed_count ? (
                  <>
                    <span className="review-count">{summary.data.unreviewed_count}</span>
                    <span>To review</span>
                  </>
                ) : (
                  <>All reviewed</>
                )}
              </h2>
              <button
                className={`button ${summary.data.unreviewed_count ? 'primary' : 'secondary'}`}
                onClick={() => navigate(summary.data!.unreviewed_count ? 'review' : 'transactions')}
              >
                {summary.data.unreviewed_count ? 'Review' : 'See transactions'}
                <ArrowRight size={17} />
              </button>
            </StarPanel>
          </div>
        )
      )}
      <div className="overview-bottom">
        <section className="recent-section">
          <div className="section-heading">
            <h2>Recent transactions</h2>
            <button className="text-button" onClick={() => navigate('transactions')}>
              All transactions
              <ArrowRight size={16} />
            </button>
          </div>
          {recent.error ? (
            <Notice>{recent.error}</Notice>
          ) : recent.loading ? (
            <Skeleton />
          ) : recent.data?.count ? (
            <TransactionRows rows={recent.data.results.slice(0, 5)} onSelect={onSelect} />
          ) : (
            <Empty title="No transactions">Connect a bank in Settings.</Empty>
          )}
          <p className="freshness">
            <RefreshCw size={13} />
            {bank.provider === 'demo' ? 'Sample data · ' : 'Last bank sync · '}
            {timeText(bank.last_synced_at)}
          </p>
        </section>
        <section className="category-section">
          <div className="section-heading">
            <h2>By category</h2>
          </div>
          {summary.loading ? (
            <Skeleton />
          ) : groups.length ? (
            <div className="category-bars">
              {groups.map((group) => (
                <div className="category-bar" key={group.category_id ?? 'none'}>
                  <div>
                    <span>{group.name}</span>
                    <strong>{money(group.net_spend_cents)}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      className={group.net_spend_cents < 0 ? 'refund-bar' : ''}
                      style={{ width: `${(Math.abs(group.net_spend_cents) / largest) * 100}%` }}
                    />
                  </div>
                  {group.net_spend_cents < 0 && <small>Refunds exceed spending</small>}
                </div>
              ))}
            </div>
          ) : (
            <p className="helper">No posted spending this month.</p>
          )}
        </section>
      </div>
    </>
  );
}
