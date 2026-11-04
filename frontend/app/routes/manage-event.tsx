import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '~/lib/api';
import { initials, isCoach, type Event, type User } from '~/lib/types';
import { useApp } from './app-layout';

export default function ManageEvent() {
  const { eventId } = useParams();
  const { user, authReady, openAuth, refreshEvents } = useApp();
  const [event, setEvent] = useState<Event | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { if (eventId) setEvent(await api<Event>(`/events/${eventId}`)); }, [eventId]);
  useEffect(() => { if (!isCoach(user)) return; refresh().catch(cause => setError((cause as Error).message)); api<User[]>('/users').then(setUsers).catch(cause => setError((cause as Error).message)); }, [refresh, user?.role]);
  async function run(task: () => Promise<void>) { setError(''); setBusy(true); try { await task(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }
  if (!authReady) return <div className="welcome-panel"><h2>Loading account…</h2></div>;
  if (!isCoach(user)) return <div className="welcome-panel"><h2>Coach access required</h2><p>Sign in as a coach or admin to manage an event.</p>{!user && <button className="button button-blue" onClick={openAuth}>Sign in ↗</button>}</div>;
  if (!event) return <div className="welcome-panel"><h2>{error ? 'Event unavailable' : 'Loading event…'}</h2><p>{error}</p></div>;
  const draft = event.status === 'draft';
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> COACH DESK</div><h1>Manage <em>{event.name}</em></h1><p>{draft ? 'Build the roster, then generate a randomized round robin schedule.' : 'View the event and manage its score access.'}</p></div><Link className="button button-outline" to={`/events/${event.id}`}>View event ↗</Link></div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <section className="panel manage-panel"><div className="section-head"><div><div className="section-kicker">EVENT ROSTER</div><h2>{event.players.length} players</h2><p>{draft ? 'Add players by name or select registered accounts.' : 'The roster is locked because the schedule has been generated.'}</p></div></div>
      <div className="roster-list">{event.players.map(player => <div key={player.id}><span className="player-avatar">{initials(player.name)}</span><strong>{player.name}</strong>{draft && <button className="action-muted" disabled={busy} onClick={() => run(async () => { await api(`/events/${event.id}/players/${player.id}`, { method: 'DELETE' }); await refresh(); })}>Remove</button>}</div>)}{event.players.length === 0 && <span>No players added yet.</span>}</div>
      {draft && <div className="roster-manager"><form onSubmit={(form: FormEvent) => { form.preventDefault(); run(async () => { await api(`/events/${event.id}/players`, { method: 'POST', body: JSON.stringify({ name: playerName }) }); setPlayerName(''); await refresh(); }); }}><label>Player name<input className="field" required maxLength={100} placeholder="e.g. Floyd" value={playerName} onChange={input => setPlayerName(input.target.value)} /></label><button className="button button-outline" disabled={busy}>Add player</button></form>
        <form onSubmit={(form: FormEvent) => { form.preventDefault(); run(async () => { await api(`/events/${event.id}/players`, { method: 'POST', body: JSON.stringify({ user_id: Number(registeredId) }) }); setRegisteredId(''); await refresh(); }); }}><label>Or select a registered account<select className="field" required value={registeredId} onChange={input => setRegisteredId(input.target.value)}><option value="">Choose account</option>{users.filter(account => !event.players.some(player => player.id === account.id)).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><button className="button button-outline" disabled={busy || !registeredId}>Add account</button></form>
        <button className="button button-red" disabled={busy || event.players.length < 2} onClick={() => run(async () => { await api(`/events/${event.id}/generate-schedule`, { method: 'POST' }); await refresh(); await refreshEvents(); })}>Generate round robin schedule ↗</button><small>Each pair will meet once. Generating the schedule locks the roster.</small>
      </div>}
    </section>
    <section className="panel manage-panel"><div className="section-head"><div><div className="section-kicker">SCORE ACCESS</div><h2>Event password</h2><p>{event.has_password ? 'Changing it removes previous scoring access.' : 'Set a password so signed-in people can enter scores.'}</p></div></div>
      <form className="password-reset" onSubmit={(form: FormEvent) => { form.preventDefault(); run(async () => { await api(`/events/${event.id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }); setPassword(''); await refresh(); }); }}><label>{event.has_password ? 'New password' : 'Password'}<input className="field" type="password" minLength={6} maxLength={128} required placeholder="Event password" value={password} onChange={input => setPassword(input.target.value)} /></label><button className="button button-outline" disabled={busy}>Save password</button></form>
    </section>
  </>;
}
