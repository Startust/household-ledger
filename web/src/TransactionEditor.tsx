import { useState, type FormEvent } from 'react';
import { Check, History } from 'lucide-react';
import { api, ApiError } from './api';
import { Dialog, Notice } from './components';
import {
  dateText,
  flowNames,
  money,
  timeText,
  type Category,
  type Edit,
  type Flow,
  type Transaction,
} from './types';

export function TransactionEditor({
  row: initial,
  categories,
  onClose,
  onSaved,
  online,
}: {
  row: Transaction;
  categories: Category[];
  onClose: () => void;
  onSaved: (row: Transaction) => void;
  online: boolean;
}) {
  const [row, setRow] = useState(initial),
    [selected, setSelected] = useState(initial.categories.map((c) => c.id));
  const [flow, setFlow] = useState<Flow>(initial.flow),
    [note, setNote] = useState(initial.note),
    [reviewed, setReviewed] = useState(initial.reviewed);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false);
  const [edits, setEdits] = useState<Edit[] | null>(null),
    [historyOpen, setHistoryOpen] = useState(false),
    [historyError, setHistoryError] = useState('');
  const categoriesChanged =
    selected.length !== row.categories.length ||
    selected.some((id) => !row.categories.some((c) => c.id === id));
  const dirty =
    categoriesChanged ||
    flow !== row.flow ||
    note !== row.note ||
    (flow !== 'income' && reviewed !== row.reviewed);
  function close() {
    if (!busy && (!dirty || window.confirm('Discard your unsaved changes?'))) onClose();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<Transaction>(`/api/transactions/${row.id}`, 'PATCH', {
        version: row.version,
        ...(categoriesChanged ? { categories: selected } : {}),
        ...(flow !== row.flow ? { flow } : {}),
        ...(note !== row.note ? { note } : {}),
        ...(flow !== 'income' && reviewed !== row.reviewed ? { reviewed } : {}),
      });
      onSaved(result);
      onClose();
    } catch (error) {
      const e = error as ApiError;
      if (e.status === 409) {
        setConflict(true);
        setError('This transaction has changed. Load the latest version before making your edits.');
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    try {
      const fresh = await api<Transaction>(`/api/transactions/${row.id}`);
      setRow(fresh);
      setSelected(fresh.categories.map((c) => c.id));
      setFlow(fresh.flow);
      setNote(fresh.note);
      setReviewed(fresh.reviewed);
      setConflict(false);
      setError('');
      setEdits(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory() {
    setHistoryOpen(!historyOpen);
    if (!edits)
      try {
        setEdits(await api<Edit[]>(`/api/transactions/${row.id}/history`));
      } catch (e) {
        setHistoryError((e as Error).message);
      }
  }
  return (
    <Dialog title="Transaction" onClose={close} className="editor-dialog">
      <form onSubmit={save}>
        <div className="editor-summary">
          <span>{row.merchant || row.name}</span>
          <strong>
            {row.amount_cents < 0 ? '+' : '−'}
            {money(Math.abs(row.amount_cents))}
          </strong>
          <p>
            {dateText(row.date)} · {row.pending ? 'Pending at the bank' : 'Posted'} · USD
          </p>
        </div>
        {row.removed && <Notice>The bank removed this transaction. It is now read-only.</Notice>}
        {error && (
          <Notice>
            {error}
            {conflict && (
              <button type="button" className="text-button" onClick={reload} disabled={busy}>
                Load latest (replaces unsaved edits)
              </button>
            )}
          </Notice>
        )}
        <fieldset className="category-picker" disabled={busy || row.removed || !online}>
          <legend>Categories</legend>
          <div>
            <button
              type="button"
              className="category-choice"
              aria-pressed={selected.length === 0}
              onClick={() => setSelected([])}
            >
              Uncategorized
            </button>
            {categories
              .filter((c) => c.active || row.categories.some((saved) => saved.id === c.id))
              .map((c) => (
                <label className="category-choice" key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.id]
                          : selected.filter((id) => id !== c.id),
                      )
                    }
                  />
                  <span>
                    {c.name}
                    {!c.active && ' · Archived'}
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        <label>
          Type
          <select
            value={flow}
            onChange={(e) => {
              const next = e.target.value as Flow;
              if (flow === 'income' && next !== 'income') setReviewed(false);
              setFlow(next);
            }}
          >
            {(Object.keys(flowNames) as Flow[])
              .filter(
                (f) =>
                  f === 'transfer' ||
                  (row.amount_cents < 0 ? f === 'income' || f === 'refund' : f === 'expense'),
              )
              .map((f) => (
                <option key={f} value={f}>
                  {flowNames[f]}
                </option>
              ))}
          </select>
        </label>
        <label>
          Note<span className="optional">Optional</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </label>
        {flow !== 'income' && (
          <label className="check-line">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={row.pending}
            />
            <span>
              <strong>Reviewed</strong>
              <small>
                {row.pending
                  ? 'Available after posting.'
                  : row.reviewed_by_name
                    ? `Reviewed by ${row.reviewed_by_name}`
                    : 'Shared with your household.'}
              </small>
            </span>
          </label>
        )}
        <button
          className="button primary full"
          disabled={!dirty || busy || conflict || !online || row.removed}
        >
          {busy ? (
            'Saving…'
          ) : (
            <>
              <Check size={18} />
              Save transaction
            </>
          )}
        </button>
        {!online && <p className="helper">Offline. Keep this window open until you can save.</p>}
        <button
          type="button"
          className="history-toggle text-button"
          onClick={loadHistory}
          aria-expanded={historyOpen}
        >
          <History size={16} />
          Edit history
        </button>
        {historyOpen && (
          <div className="history-list">
            {historyError ? (
              <Notice>{historyError}</Notice>
            ) : edits === null ? (
              <p>Loading…</p>
            ) : edits.length === 0 ? (
              <p>No edits yet.</p>
            ) : (
              edits.map((edit, index) => (
                <div key={index}>
                  <strong>{edit.actor || 'Household member'}</strong>
                  <span>{timeText(edit.created_at)}</span>
                  <p>
                    {Object.keys(edit.changes)
                      .map(
                        (k) =>
                          ({
                            category: 'Category',
                            categories: 'Categories',
                            flow: 'Type',
                            reviewed: 'Review status',
                            note: 'Note',
                          })[k] ?? k,
                      )
                      .join(', ') || 'Saved'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}
