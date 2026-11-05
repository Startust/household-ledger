import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Coffee,
  CreditCard,
  ShoppingBag,
  ShoppingBasket,
  X,
} from 'lucide-react';
import type { Transaction } from './types';
import { dateText, flowNames, money } from './types';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <span className="brand-mark">
        <BookOpen size={23} strokeWidth={1.6} />
      </span>
      <div>
        <span className="brand-name">Home Ledger</span>
      </div>
    </div>
  );
}
export function Notice({
  children,
  kind = 'error',
}: {
  children: ReactNode;
  kind?: 'error' | 'info' | 'success';
}) {
  return (
    <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={32} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton" aria-label="Loading your ledger" role="status">
      <span />
      <span />
      <span />
    </div>
  );
}
let openDialogs = 0;
let bodyOverflowBeforeDialogs = '';

export function Dialog({
  title,
  children,
  onClose,
  className = '',
  role = 'dialog',
  initialFocusRef,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current!;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    d.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });
    if (openDialogs === 0) bodyOverflowBeforeDialogs = document.body.style.overflow;
    openDialogs++;
    document.body.style.overflow = 'hidden';
    return () => {
      d.close();
      openDialogs--;
      if (openDialogs === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
      role={role}
      aria-labelledby={titleId}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ConfirmDialog({
  title,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      role="alertdialog"
      className="confirmation-dialog"
      initialFocusRef={cancelRef}
    >
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" className="button secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="button danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
export function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Install Home Ledger" onClose={onClose}>
      <ol className="install-steps">
        <li>
          <strong>Open your ledger in Safari</strong>
          <span></span>
        </li>
        <li>
          <strong>Tap Share</strong>
          <span>Choose Add to Home Screen from the menu.</span>
        </li>
        <li>
          <strong>Open as Web App</strong>
          <span>If this switch appears, turn it on, then tap Add.</span>
        </li>
      </ol>
      <Notice kind="info">
        You need a reachable HTTPS address for your iPhone. The 127.0.0.1 address is only a preview
        on this computer.
      </Notice>
      <p className="helper">
        On supported desktop browsers, use the install button in the address bar.
      </p>
      <button className="button primary full" onClick={onClose}>
        Got it
      </button>
    </Dialog>
  );
}
function MerchantIcon({ row }: { row: Transaction }) {
  const name = (row.merchant || row.name).toLowerCase();
  const Icon =
    row.flow === 'transfer'
      ? ArrowLeftRight
      : row.flow === 'income'
        ? ArrowDownLeft
        : row.flow === 'refund'
          ? ArrowUpRight
          : /coffee|starbucks|cafe/.test(name)
            ? Coffee
            : /costco|grocery|market/.test(name)
              ? ShoppingBasket
              : ShoppingBag;
  return (
    <span className={`merchant-icon ${row.flow}`}>
      <Icon size={21} strokeWidth={1.65} />
    </span>
  );
}
export function TransactionRows({
  rows,
  onSelect,
  dates = true,
}: {
  rows: Transaction[];
  onSelect: (row: Transaction) => void;
  dates?: boolean;
}) {
  return (
    <div className="transaction-list" role="list">
      {rows.map((row) => (
        <div role="listitem" key={row.id}>
          <button
            className="transaction-row"
            onClick={() => onSelect(row)}
            aria-label={`${row.merchant || row.name} ${money(Math.abs(row.amount_cents))} ${row.pending ? 'Pending' : row.flow === 'income' ? 'Income' : row.reviewed ? 'Reviewed' : 'To review'}`}
          >
            <MerchantIcon row={row} />
            <span className="transaction-copy">
              <strong>{row.merchant || row.name}</strong>
              <span className="transaction-meta">
                {row.categories.map((c) => c.name).join(' · ') ||
                  (row.flow === 'transfer'
                    ? 'Account transfer'
                    : row.flow === 'income'
                      ? 'Income'
                      : 'Uncategorized')}
                {dates && (
                  <>
                    <span className="dot">·</span>
                    {dateText(row.date)}
                  </>
                )}
                {row.note && <span className="row-note"> · Note</span>}
              </span>
            </span>
            <span className="transaction-amount">
              <strong className={row.amount_cents < 0 ? 'credit' : ''}>
                {row.amount_cents < 0 ? '+' : '−'}
                {money(Math.abs(row.amount_cents))}
              </strong>
              {(row.pending || row.flow !== 'income') && (
                <span
                  className={`state ${row.pending ? 'pending' : row.reviewed ? 'reviewed' : 'unreviewed'}`}
                >
                  {row.pending ? (
                    'Pending'
                  ) : row.reviewed ? (
                    <>
                      <Check size={12} />
                      Reviewed
                    </>
                  ) : (
                    'To review'
                  )}
                </span>
              )}
            </span>
            <ChevronRight className="row-chevron" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function HelpTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="help-tip">
      <button
        className="icon-button small"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="How is this calculated?"
      >
        <CircleHelp size={16} />
      </button>
      {open && (
        <span className="help-copy" role="status">
          {children}
        </span>
      )}
    </span>
  );
}
