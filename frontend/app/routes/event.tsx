import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { MatchList } from '~/components/MatchList';
import { ScoreDialog } from '~/components/ScoreDialog';
import { Standings } from '~/components/Standings';
import { api } from '~/lib/api';
import { isCoach, type Event, type Match } from '~/lib/types';
import { useApp } from './app-layout';

export default function EventPage() {
  const { eventId } = useParams();
  const { user, openAuth } = useApp();
  const coach = isCoach(user);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [editing, setEditing] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!eventId) return;
    setEvent(await api<Event>(`/events/${eventId}`));
  }, [eventId]);
  useEffect(() => { setEvent(null); refresh().catch(cause => setError((cause as Error).message)); }, [refresh, user?.id]);
  async function join(eventForm: FormEvent) {
    eventForm.preventDefault(); if (!event) return;
    setError(''); setBusy(true);
    try { await api(`/events/${event.id}/join`, { method: 'POST', body: JSON.stringify({ password }) }); setPassword(''); await refresh(); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  if (!event) return <div className="welcome-panel"><h2>{error ? 'Event unavailable' : 'Loading event…'}</h2><p>{error}</p></div>;
  const played = event.matches.filter(match => match.status === 'completed').length;
  const leader = played ? event.standings[0] : null;
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CLUB COMPETITION</div><h1>Rankings <em>&amp;</em> results</h1><p>Follow the round robin. See every set, point, and place.</p></div><div className="heading-actions">{coach && <Link className="button button-outline" to={`/manage/events/${event.id}`}>Manage event</Link>}{event.can_score && event.status !== 'draft' && <a className="button button-red" href="#matches">Record a match ↗</a>}</div></div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <div className="event-strip"><div className="event-strip-icon">✦</div><div><span>NOW VIEWING</span><strong>{event.name}</strong></div><div className="event-strip-meta"><span className={`status-pill ${event.status === 'complete' ? 'done' : ''}`}><i />{event.status === 'complete' ? 'Completed' : event.status === 'draft' ? 'Draft' : 'In progress'}</span><span>Best of {event.best_of}</span><span>{event.standings.length} players</span></div></div>
    {user && !event.can_score && <section className="access-panel"><div><div className="section-kicker">EVENT ACCESS</div><h2>Have the event password?</h2><p>Enter it once to unlock score entry. You can view standings without joining.</p></div><form onSubmit={join}><input className="field" type="password" minLength={6} required placeholder="Event password" value={password} onChange={input => setPassword(input.target.value)} /><button className="button button-blue" disabled={busy || !event.has_password}>Unlock scoring ↗</button></form>{!event.has_password && <small>The coach needs to set a password first.</small>}</section>}
    {!user && <div className="draft-banner"><strong>Want to enter scores?</strong><span>Sign in, then enter the event password to unlock scoring.</span><button className="action-button" onClick={openAuth}>Sign in ↗</button></div>}
    {event.status === 'draft' && <div className="draft-banner"><strong>Roster in progress</strong><span>{event.players.length} player{event.players.length === 1 ? '' : 's'} added. Matches appear after the coach generates the schedule.</span>{coach && <Link to={`/manage/events/${event.id}`}>Manage roster ↗</Link>}</div>}
    <div className="stats-grid"><div className="stat-card stat-blue"><div className="stat-top"><span>01 / MATCHES PLAYED</span><span className="stat-symbol">↗</span></div><div className="stat-value">{played}<span>/{event.matches.length}</span></div><div className="progress-track"><div style={{ width: `${event.matches.length ? played / event.matches.length * 100 : 0}%` }} /></div><p>{event.matches.length - played} matches remaining</p></div>
      <div className="stat-card stat-red"><div className="stat-top"><span>02 / CURRENT LEADER</span><span className="stat-symbol">★</span></div><div className="stat-value stat-name">{leader?.name || '—'}</div><p>{leader ? `${leader.wins} wins · ${leader.set_difference >= 0 ? '+' : ''}${leader.set_difference} set difference` : 'Results will appear here'}</p></div>
      <div className="stat-card stat-yellow"><div className="stat-top"><span>03 / TOTAL POINTS</span><span className="stat-symbol">✳</span></div><div className="stat-value">{event.standings.reduce((sum, row) => sum + row.points_won, 0)}</div><p>Scored across all completed matches</p></div></div>
    <Standings rows={event.standings} />
    <MatchList event={event} coach={coach} onEdit={setEditing} onChanged={refresh} />
    {editing && <ScoreDialog key={editing.id} match={editing} bestOf={event.best_of} onClose={() => setEditing(null)} onSaved={refresh} />}
  </>;
}
