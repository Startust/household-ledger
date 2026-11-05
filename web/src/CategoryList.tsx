import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { api } from './api';
import { Dialog, Notice } from './components';
import type { Category } from './types';

function CategoryRow({
  category,
  open,
  setOpen,
  edit,
  remove,
  online,
}: {
  category: Category;
  open: boolean;
  setOpen: (open: boolean) => void;
  edit: () => void;
  remove: (trigger: HTMLButtonElement | null) => void;
  online: boolean;
}) {
  const gesture = useRef<{ x: number; y: number; start: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const actions = useRef<HTMLButtonElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const offset = drag ?? (open ? -86 : 0);
  function move(e: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        gesture.current = null;
        return;
      }
      if (Math.abs(dx) < 10) return;
      start.horizontal = true;
      suppressClick.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(Math.max(-86, Math.min(0, start.start + dx)));
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (start?.horizontal) setOpen(start.start + e.clientX - start.x < -36);
    gesture.current = null;
    setDrag(null);
  }
  return (
    <div
      className="category-swipe"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div
        className={`category-front${drag !== null ? ' dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)`, paddingLeft: -offset }}
        onPointerDown={(e) => {
          if (!online || e.button !== 0) return;
          suppressClick.current = false;
          gesture.current = {
            x: e.clientX,
            y: e.clientY,
            start: open ? -86 : 0,
            horizontal: false,
          };
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (suppressClick.current && e.detail !== 0) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <button
          className="category-edit"
          disabled={!online}
          onClick={() => {
            if (open) setOpen(false);
            else edit();
          }}
        >
          <span>
            {category.name}
            {!category.active && <small>Archived</small>}
          </span>
        </button>
        <button
          ref={actions}
          className="icon-button category-more"
          aria-label={`Actions for ${category.name}`}
          aria-expanded={open}
          disabled={!online}
          onClick={() => setOpen(!open)}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <button
        className="category-delete"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        disabled={!online}
        onClick={() => {
          if (open) remove(actions.current);
        }}
      >
        Delete
      </button>
    </div>
  );
}

export function CategoryList({
  categories,
  edit,
  refresh,
  online,
}: {
  categories: Category[];
  edit: (category: Category | null) => void;
  refresh: () => void;
  online: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const add = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!deleting) returnFocus.current?.focus();
  }, [deleting]);
  useEffect(() => {
    if (removed.length) add.current?.focus();
  }, [removed]);
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/categories/${deleting.id}`, 'DELETE');
      returnFocus.current = null;
      setRemoved((ids) => [...ids, deleting.id]);
      setDeleting(null);
      setOpen(null);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <div className="section-heading">
        <h2>Categories</h2>
        <button ref={add} className="text-button" onClick={() => edit(null)} disabled={!online}>
          <Plus size={16} />
          Add
        </button>
      </div>
      <div className="category-settings">
        {categories
          .filter((c) => !removed.includes(c.id))
          .map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              open={open === c.id}
              setOpen={(show) => setOpen(show ? c.id : null)}
              edit={() => edit(c)}
              remove={(trigger) => {
                returnFocus.current = trigger;
                setError('');
                setDeleting(c);
              }}
              online={online}
            />
          ))}
      </div>
      {deleting && (
        <Dialog
          title="Delete category?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="delete-category-name">{deleting.name}</p>
          {error && <Notice>{error}</Notice>}
          <div className="dialog-actions">
            <button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button className="button danger" disabled={busy || !online} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
