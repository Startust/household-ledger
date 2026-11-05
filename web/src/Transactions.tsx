import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { useResource } from './hooks';
import { ExportMenu } from './ExportMenu';
import { Empty, Notice, Skeleton, TransactionRows } from './components';
import type { Page, Transaction } from './types';

export function Transactions({
  revision,
  review,
  onSelect,
}: {
  revision: number;
  review: boolean;
  onSelect: (row: Transaction) => void;
}) {
  const [filter, setFilter] = useState(review ? 'review' : 'all'),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setFilter(review ? 'review' : 'all');
    setPage(1);
  }, [review]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    page: String(page),
    ...(query ? { search: query } : {}),
    ...(filter === 'review'
      ? { reviewed: 'false', pending: 'false' }
      : filter === 'pending'
        ? { pending: 'true' }
        : filter === 'uncategorized'
          ? { uncategorized: 'true' }
          : {}),
  });
  const { data, error, loading } = useResource<Page<Transaction>>(
    `/api/transactions?${params}`,
    revision + retry,
  );
  const filters = [
    ['all', 'All transactions'],
    ['review', 'To review'],
    ['pending', 'Pending'],
    ['uncategorized', 'Uncategorized'],
  ];
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{filter === 'review' ? 'To review' : 'Transactions'}</h1>
        </div>
        <ExportMenu
          params={new URLSearchParams([...params].filter(([key]) => key !== 'page'))}
          scope="All matching transactions"
          disabled={loading || !!error || search.trim() !== query}
        />
      </header>
      <div className="transaction-tools">
        <div className="filter-tabs" role="group" aria-label="Filter transactions">
          {filters.map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              key={value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search transactions</span>
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchants or notes"
          />
          {search && (
            <button
              className="icon-button small"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <X size={15} />
            </button>
          )}
        </label>
      </div>
      {error ? (
        <Notice>
          {error}
          <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </Notice>
      ) : loading ? (
        <Skeleton />
      ) : (
        data && (
          <>
            <div className="list-caption">
              <span>{data.count} transactions</span>
            </div>
            {data.count ? (
              <TransactionRows rows={data.results} onSelect={onSelect} />
            ) : (
              <Empty
                title={
                  filter === 'review' && !search ? 'No transactions to review' : 'No transactions'
                }
              >
                {filter === 'review' && !search
                  ? null
                  : search
                    ? 'Try another merchant or clear your search.'
                    : 'No matching transactions.'}
              </Empty>
            )}
            {(data.previous || data.next) && (
              <nav className="pagination" aria-label="Transaction pages">
                <button
                  className="button secondary"
                  disabled={!data.previous}
                  onClick={() => setPage((n) => n - 1)}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="button secondary"
                  disabled={!data.next}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </nav>
            )}
          </>
        )
      )}
    </>
  );
}
