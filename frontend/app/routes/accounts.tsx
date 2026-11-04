import { useEffect, useState } from 'react';
import { api } from '~/lib/api';
import { initials, type User } from '~/lib/types';
import { useApp } from './app-layout';

export default function Accounts() {
  const { user, authReady, openAuth } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user?.role === 'admin') api<User[]>('/users').then(setUsers).catch(cause => setError((cause as Error).message)); }, [user?.role]);
  if (!authReady) return <div className="welcome-panel"><h2>Loading account…</h2></div>;
  if (user?.role !== 'admin') return <div className="welcome-panel"><h2>Admin access required</h2><p>Sign in as an admin to manage account roles.</p>{!user && <button className="button button-blue" onClick={openAuth}>Sign in ↗</button>}</div>;
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div><h1>Account <em>roles</em></h1><p>Give trusted members coach access.</p></div></div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <section className="panel roles-panel"><div className="section-head"><div><div className="section-kicker">REGISTERED MEMBERS</div><h2>People</h2></div></div><div className="role-list">{users.filter(account => account.id !== user.id).map(account => <div key={account.id}><span className="player-avatar">{initials(account.name)}</span><strong>{account.name}</strong><span>{account.role}</span><button className="action-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await api(`/users/${account.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: account.role === 'coach' ? 'player' : 'coach' }) }); setUsers(await api('/users')); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }}>Change role ↗</button></div>)}{users.length <= 1 && <p className="form-hint">Other accounts will appear here after they sign up.</p>}</div></section>
  </>;
}
