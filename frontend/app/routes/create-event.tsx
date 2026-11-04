import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '~/lib/api';
import { isCoach } from '~/lib/types';
import { useApp } from './app-layout';

export default function CreateEvent() {
  const { user, authReady, openAuth, refreshEvents } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [bestOf, setBestOf] = useState(5);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(form: FormEvent) {
    form.preventDefault(); setError(''); setBusy(true);
    try {
      const created = await api<{ id: number }>('/events', { method: 'POST', body: JSON.stringify({ name, best_of: bestOf, event_password: password }) });
      await refreshEvents();
      navigate(`/manage/events/${created.id}`);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  if (!authReady) return <div className="welcome-panel"><h2>Loading account…</h2></div>;
  if (!isCoach(user)) return <div className="welcome-panel"><h2>Coach access required</h2><p>Sign in as a coach or admin to create an event.</p>{!user && <button className="button button-blue" onClick={openAuth}>Sign in ↗</button>}</div>;
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> COACH DESK</div><h1>Create an <em>event</em></h1><p>Start with the event details. Add players on the next page.</p></div><Link className="button button-outline" to="/">Cancel</Link></div>
    <section className="panel manage-panel create-event-panel"><div className="section-kicker">NEW COMPETITION</div><h2>Event details</h2><p className="form-hint">The event begins as a draft. You can add players before generating the match schedule.</p>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
      <form onSubmit={submit}><div className="form-row"><label>Event name<input className="field" required maxLength={120} placeholder="e.g. November Club Round Robin" value={name} onChange={input => setName(input.target.value)} /></label><label>Match format<select className="field" value={bestOf} onChange={input => setBestOf(Number(input.target.value))}>{[3, 5, 7].map(number => <option key={number} value={number}>Best of {number}</option>)}</select></label></div>
        <label className="event-password-field">Event password<input className="field" type="password" minLength={6} maxLength={128} required placeholder="Share with people who will enter scores" value={password} onChange={input => setPassword(input.target.value)} /></label>
        <button className="button button-blue" disabled={busy}>Create event ↗</button>
      </form>
    </section></>;
}
