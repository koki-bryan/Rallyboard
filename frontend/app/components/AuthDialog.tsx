import { useState, type FormEvent } from 'react';
import { api } from '~/lib/api';
import type { User } from '~/lib/types';

type Props = { onClose: () => void; onSuccess: (user: User) => void };
export function AuthDialog({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const user = await api<User>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      onSuccess(user);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Sign in' : 'Create account'} onClick={event => event.stopPropagation()}>
    <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
    <div className="section-kicker">WELCOME TO THE LADDER</div><h2>{mode === 'login' ? 'Good to see you.' : 'Join the club.'}</h2><p>{mode === 'login' ? 'Sign in to record match scores.' : 'Create an account to take part.'}</p>
    {error && <div className="modal-error" role="alert">{error}</div>}
    <form onSubmit={submit}>{mode === 'signup' && <label>Name<input className="field" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>}
      <label>Email<input className="field" required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
      <label>Password<input className="field" required minLength={8} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
      <button className="button button-blue" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'} ↗</button>
    </form>
    <button className="switch-mode" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already a member? Sign in'}</button>
  </section></div>;
}
