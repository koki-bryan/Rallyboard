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
  return <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/60 p-[18px]" onClick={onClose}><section className="relative max-h-[90vh] w-full max-w-[440px] overflow-auto rounded-xl bg-white p-[30px] shadow-2xl [&_h2]:my-2 [&_h2]:text-[28px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-muted [&_form>label]:my-4 [&_form>label]:block [&_form>label]:text-[11px] [&_form>label]:font-bold [&_form>label]:text-muted " role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Sign in' : 'Create account'} onClick={event => event.stopPropagation()}>
    <button className="absolute right-5 top-4 border-0 bg-transparent text-2xl text-muted" aria-label="Close" onClick={onClose}>×</button>
    <div className="text-[10px] font-bold tracking-[2px] text-blue">WELCOME TO RALLYBOARD</div><h2>{mode === 'login' ? 'Good to see you.' : 'Join the club.'}</h2><p>{mode === 'login' ? 'Sign in to record match scores.' : 'Create an account to take part.'}</p>
    {error && <div className="mb-2.5 rounded-md bg-red-soft px-3 py-2.5 text-xs text-red" role="alert">{error}</div>}
    <form onSubmit={submit}>{mode === 'signup' && <label>Name<input className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>}
      <label>Email<input className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
      <label>Password<input className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" required minLength={8} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
      <button className="mt-2 w-full inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'} ↗</button>
    </form>
    <button className="mx-auto mt-4 block border-0 bg-transparent text-[11px] font-bold text-blue" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already a member? Sign in'}</button>
  </section></div>;
}
