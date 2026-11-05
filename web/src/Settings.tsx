import { useState, type FormEvent } from 'react';
import { ArrowRight, Bell, Check, Download, LogOut, Pencil, Plus, Users } from 'lucide-react';
import { api } from './api';
import { Dialog, InstallHelp, Notice } from './components';
import { BankPanel } from './BankPanel';
import type { Bank, Category, Household, User } from './types';

function CategoryForm({
  value,
  close,
  saved,
}: {
  value: Category | null;
  close: () => void;
  saved: () => void;
}) {
  const [name, setName] = useState(value?.name ?? ''),
    [active, setActive] = useState(value?.active ?? true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(
        value ? `/api/categories/${value.id}` : '/api/categories',
        value ? 'PATCH' : 'POST',
        { name: name.trim(), ...(value ? { active } : {}) },
      );
      saved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={value ? 'Edit category' : 'New category'}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={save}>
        {error && <Notice>{error}</Notice>}
        <label>
          Category name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        {value && (
          <label className="check-line">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>
              <strong>Active</strong>
              <small>
                Archived categories stay on past transactions but cannot be assigned to new ones.
              </small>
            </span>
          </label>
        )}
        <button className="button primary full" disabled={busy || !name.trim()}>
          {busy ? 'Saving…' : 'Save category'}
        </button>
      </form>
    </Dialog>
  );
}
function PasswordForm({ close, changed }: { close: () => void; changed: () => void }) {
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/password', 'POST', { current_password: current, new_password: next });
      changed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Change password"
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={save}>
        <p className="helper">Saving signs this account out on all devices.</p>
        {error && <Notice>{error}</Notice>}
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            maxLength={256}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={12}
            maxLength={256}
          />
          <small>Use at least 12 characters, not only digits or your username.</small>
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={12}
            maxLength={256}
          />
        </label>
        <button className="button primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Save password and sign out'}
        </button>
      </form>
    </Dialog>
  );
}
export function Settings({
  user,
  household,
  categories,
  bank,
  refresh,
  logout,
  passwordChanged,
  online,
}: {
  user: User;
  household: Household;
  categories: Category[];
  bank: Bank;
  refresh: () => void;
  logout: () => void;
  passwordChanged: () => void;
  online: boolean;
}) {
  const [name, setName] = useState(household.name),
    [timezone, setTimezone] = useState(household.timezone),
    [hour, setHour] = useState(household.digest_hour),
    [enabled, setEnabled] = useState(household.digest_enabled);
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [category, setCategory] = useState<Category | null | undefined>(undefined),
    [password, setPassword] = useState(false),
    [install, setInstall] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/household', 'PATCH', {
        name: name.trim(),
        timezone,
        digest_hour: hour,
        digest_enabled: enabled,
      });
      setMessage('Settings saved.');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Settings</h1>
        </div>
      </header>
      <div className="settings-layout">
        <div>
          <section className="settings-section">
            <h2>Members</h2>
            <div className="members">
              {household.members.map((name, index) => (
                <div className="member" key={name}>
                  <span className={`avatar avatar-${index}`}>{name.slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{name}</strong>
                    <small>{name === user.username ? 'You' : 'Household member'}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <form className="settings-section" onSubmit={save}>
            <h2>Household</h2>
            {error && <Notice>{error}</Notice>}
            {message && <Notice kind="success">{message}</Notice>}
            <label>
              Ledger name
              <input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>
                <strong>Daily summary</strong>
                <small>Shown in Updates.</small>
              </span>
            </label>
            <div className="form-grid">
              <label>
                Every day at
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  disabled={!enabled}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option value={i} key={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time zone
                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  list="timezones"
                  required
                />
                <datalist id="timezones">
                  {[
                    'America/New_York',
                    'America/Chicago',
                    'America/Denver',
                    'America/Los_Angeles',
                    'Asia/Shanghai',
                    'Europe/London',
                    'UTC',
                  ].map((zone) => (
                    <option key={zone} value={zone} />
                  ))}
                </datalist>
              </label>
            </div>
            <p className="helper">In-app summaries only. Push notifications are not enabled.</p>
            <button className="button primary" disabled={busy || !online || !name.trim()}>
              <Check size={16} />
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </form>
          <BankPanel bank={bank} refresh={refresh} online={online} />
        </div>
        <div>
          <section className="settings-section">
            <div className="section-heading">
              <h2>Categories</h2>
              <button className="text-button" onClick={() => setCategory(null)} disabled={!online}>
                <Plus size={16} />
                Add
              </button>
            </div>
            <div className="category-settings">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategory(c)} disabled={!online}>
                  <span>
                    {c.name}
                    {!c.active && <small>Archived</small>}
                  </span>
                  <Pencil size={15} />
                </button>
              ))}
            </div>
          </section>
          <section className="settings-section">
            <h2>Install app</h2>
            <button className="setting-action" onClick={() => setInstall(true)}>
              <Download size={19} />
              <span>Add to iPhone Home Screen</span>
              <ArrowRight size={16} />
            </button>
          </section>
          <section className="settings-section">
            <h2>Account</h2>
            <button className="setting-action" onClick={() => setPassword(true)} disabled={!online}>
              <span>Change password</span>
              <ArrowRight size={16} />
            </button>
            <button className="setting-action logout-action" onClick={logout} disabled={!online}>
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </section>
        </div>
      </div>
      {category !== undefined && (
        <CategoryForm value={category} close={() => setCategory(undefined)} saved={refresh} />
      )}
      {password && <PasswordForm close={() => setPassword(false)} changed={passwordChanged} />}
      {install && <InstallHelp onClose={() => setInstall(false)} />}
    </>
  );
}
