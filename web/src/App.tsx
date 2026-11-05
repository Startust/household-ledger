import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Download,
  Home,
  Mail,
  RefreshCw,
  Settings as SettingsIcon,
  WifiOff,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { api, clearSession } from './api';
import { Brand, InstallHelp, Notice, Skeleton } from './components';
import { Login } from './Login';
import { Overview } from './Overview';
import { Transactions } from './Transactions';
import { Inbox } from './Inbox';
import { Settings } from './Settings';
import { TransactionEditor } from './TransactionEditor';
import type { Bank, Category, Household, Page, Transaction, User } from './types';

const nav = [
  { id: 'home', label: 'Overview', Icon: Home },
  { id: 'transactions', label: 'Transactions', Icon: BookOpen },
  { id: 'inbox', label: 'Updates', Icon: Mail },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];
function route() {
  const hash = window.location.hash.slice(1);
  return window.location.pathname === '/oauth'
    ? 'settings'
    : ['home', 'transactions', 'review', 'inbox', 'settings'].includes(hash)
      ? hash
      : 'home';
}

export function App() {
  const [user, setUser] = useState<User | null>(null),
    [booting, setBooting] = useState(true),
    [loginMessage, setLoginMessage] = useState('');
  const [page, setPage] = useState(route),
    [home, setHome] = useState<Household | null>(null),
    [categories, setCategories] = useState<Category[]>([]),
    [bank, setBank] = useState<Bank>({ state: 'not_connected' });
  const [revision, setRevision] = useState(0),
    [month, setMonth] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null),
    [install, setInstall] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const generation = useRef(0);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  function navigate(value: string) {
    window.location.hash = value;
  }
  const reset = useCallback((message = '') => {
    generation.current++;
    clearSession();
    sessionStorage.removeItem('ledger-plaid-link');
    setUser(null);
    setHome(null);
    setCategories([]);
    setBank({ state: 'not_connected' });
    setSelected(null);
    setToast('');
    setError('');
    setLoginMessage(message);
    setMonth('');
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [household, categoryPage, connection] = await Promise.all([
        api<Household>('/api/household'),
        api<Page<Category>>('/api/categories'),
        api<Bank>('/api/bank'),
      ]);
      if (request !== generation.current) return;
      setHome(household);
      setCategories(categoryPage.results);
      setBank(connection);
      setRevision((n) => n + 1);
      setMonth(
        (current) =>
          current ||
          new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            timeZone: household.timezone,
          })
            .format(new Date())
            .slice(0, 7),
      );
    } catch (e) {
      if (request === generation.current) setError((e as Error).message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    let active = true;
    api<User>('/api/auth/me')
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((e) => {
        if (active && e.status !== 403)
          setLoginMessage('Your ledger is offline. Reconnect to sign in.');
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const changed = () => {
      setPage(route());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const expired = () => reset('Your session has expired. Please sign in again.');
    window.addEventListener('ledger:unauthorized', expired);
    return () => window.removeEventListener('ledger:unauthorized', expired);
  }, [reset]);
  useEffect(() => {
    const on = () => {
      setOnline(true);
      void refresh();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refresh]);
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void refresh();
    };
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function logout() {
    try {
      await api('/api/auth/logout', 'POST', {});
      reset();
      navigate('home');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function login(value: User) {
    setLoginMessage('');
    setUser(value);
  }
  const swPrompt = needRefresh && (
    <div className="update-banner" role="status">
      <span>Update available. Save your edits first.</span>
      <button
        className="text-button"
        disabled={!!selected}
        onClick={() => updateServiceWorker(true)}
      >
        Update & reopen
      </button>
    </div>
  );
  if (booting)
    return (
      <main className="boot-page">
        <Brand />
        <Skeleton />
      </main>
    );
  if (!user)
    return (
      <>
        {swPrompt}
        <Login onLogin={login} message={loginMessage} />
      </>
    );
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, Icon }) => (
            <a
              href={`#${id}`}
              key={id}
              aria-current={
                page === id || (id === 'transactions' && page === 'review') ? 'page' : undefined
              }
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-user" onClick={() => navigate('settings')}>
            <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{user.username}</strong>
              <small>Our home</small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <div className="mobile-topbar">
          <Brand compact />
          <button
            className="icon-button"
            onClick={() => setInstall(true)}
            aria-label="Add to Home Screen"
          >
            <Download size={19} />
          </button>
        </div>
        <div className="desktop-topbar">
          <span>{home?.name || 'Our household ledger'}</span>
          <div>
            {bank.provider === 'demo' && <span className="demo-badge">Demo ledger</span>}
            <button
              className="icon-button"
              aria-label="Refresh ledger"
              disabled={loading || !online}
              onClick={refresh}
            >
              <RefreshCw size={17} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>
        <main id="main-content" tabIndex={-1}>
          {swPrompt}
          {!online && (
            <Notice kind="info">
              <WifiOff size={17} />
              Offline. Reconnect to save or refresh.
            </Notice>
          )}
          {error && (
            <Notice>
              {error}
              <button className="text-button" onClick={refresh}>
                Reconnect
              </button>
            </Notice>
          )}
          {bank.provider === 'demo' && <div className="mobile-demo">Demo ledger · sample data</div>}
          {bank.state !== 'connected' &&
            bank.provider !== 'demo' &&
            home &&
            page !== 'settings' && (
              <Notice kind="info">
                {bank.state === 'reauth_required'
                  ? 'Your bank needs to be reconnected.'
                  : bank.state === 'not_connected'
                    ? 'Connect a bank to import transactions.'
                    : 'Bank sync is not ready. Check your account status.'}
                <button className="text-button" onClick={() => navigate('settings')}>
                  View account
                </button>
              </Notice>
            )}
          {!home || !month ? (
            <>
              <Skeleton />
              {!loading && (
                <button className="button secondary" onClick={refresh}>
                  Reload ledger
                </button>
              )}
            </>
          ) : page === 'home' ? (
            <Overview
              month={month}
              setMonth={setMonth}
              revision={revision}
              bank={bank}
              onSelect={setSelected}
              navigate={navigate}
              refresh={refresh}
            />
          ) : page === 'transactions' || page === 'review' ? (
            <Transactions revision={revision} review={page === 'review'} onSelect={setSelected} />
          ) : page === 'inbox' ? (
            <Inbox revision={revision} online={online} />
          ) : (
            <Settings
              key={home.id}
              user={user}
              household={home}
              categories={categories}
              bank={bank}
              refresh={refresh}
              logout={logout}
              online={online}
              passwordChanged={() => reset('Password updated. Sign in with your new password.')}
            />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map(({ id, label, Icon }) => (
          <a
            href={`#${id}`}
            key={id}
            aria-current={
              page === id || (id === 'transactions' && page === 'review') ? 'page' : undefined
            }
          >
            <Icon size={22} strokeWidth={1.7} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      {selected && (
        <TransactionEditor
          row={selected}
          categories={categories}
          online={online}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setToast('Saved');
            void refresh();
          }}
        />
      )}
      {install && <InstallHelp onClose={() => setInstall(false)} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
