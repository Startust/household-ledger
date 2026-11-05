import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from './api';
import { Brand, Notice } from './components';
import type { User } from './types';

export function Login({ onLogin, message }: { onLogin: (user: User) => void; message?: string }) {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<User>('/api/auth/login', 'POST', { username: username.trim(), password }));
      setPassword('');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-form-panel">
        <div className="login-brand">
          <Brand />
        </div>
        <form className="login-form" onSubmit={submit}>
          <h1>Sign in</h1>
          {message && <Notice kind="info">{message}</Notice>}
          {error && <Notice>{error}</Notice>}
          <label>
            Username
            <input
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={64}
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={256}
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? (
              'Signing in…'
            ) : (
              <>
                Sign in
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <details className="login-details">
            <summary>Need help signing in?</summary>
            <p>Ask your ledger administrator to create an account or reset your password.</p>
          </details>
        </form>
      </section>
    </main>
  );
}
