import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { AuthDialog } from '~/components/AuthDialog';
import { api } from '~/lib/api';
import { initials, isCoach, type EventItem, type User } from '~/lib/types';

export type AppContext = { user: User | null; authReady: boolean; events: EventItem[]; refreshEvents: () => Promise<void>; openAuth: () => void };
export function useApp() { return useOutletContext<AppContext>(); }

export default function AppLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  async function refreshEvents() { setEvents(await api<EventItem[]>('/events')); }
  useEffect(() => { api<User | null>('/auth/me').then(setUser).catch(() => {}).finally(() => setAuthReady(true)); refreshEvents().catch(cause => setError((cause as Error).message)); }, []);
  const current = events.find(item => location.pathname.startsWith(`/events/${item.id}`) || location.pathname.startsWith(`/manage/events/${item.id}`));
  return <div className="app-shell">
    <aside className="sidebar"><Link to="/" className="brand"><div className="brand-mark"><span /></div><div><strong>the ladder<span className="brand-dot">.</span></strong><small>TABLE TENNIS CLUB</small></div></Link>
      <div className="sidebar-label">WORKSPACE</div><nav className="side-nav" aria-label="Events"><NavLink to="/" end className={({ isActive }) => `nav-heading ${isActive ? 'nav-active' : ''}`}>Overview <span>↗</span></NavLink><div className="sidebar-label side-label-events">EVENTS</div>
      {events.length === 0 && <p className="side-empty">No events yet</p>}{events.map(item => <NavLink key={item.id} to={`/events/${item.id}`} className={({ isActive }) => `event-nav ${isActive ? 'active' : ''}`}><span className="event-nav-dot" /><span className="truncate">{item.name}</span><span className="event-arrow">›</span></NavLink>)}</nav>
      {user?.role === 'admin' && <NavLink to="/manage/accounts" className="event-nav"><span className="event-nav-dot" />Account roles<span className="event-arrow">›</span></NavLink>}
      <div className="sidebar-bottom"><span className="sidebar-ball">✦</span><div><strong>Play every point.</strong><p>Every match counts.</p></div></div></aside>
    <main className="main-content"><header className="topbar"><Link to="/" className="mobile-brand">the ladder<span>.</span></Link><div className="topbar-breadcrumb">Club rankings <span>/</span> <strong>{current?.name || (location.pathname.includes('manage') ? 'Coach desk' : 'Overview')}</strong></div><div className="topbar-actions">{user ? <><span className="user-avatar">{initials(user.name)}</span><span className="user-name">{user.name}</span><button className="text-action" onClick={async () => { try { await api('/auth/logout', { method: 'POST' }); setUser(null); navigate('/'); } catch (cause) { setError((cause as Error).message); } }}>Sign out</button></> : <button className="button button-blue" onClick={() => setShowAuth(true)}>Sign in <span>↗</span></button>}</div></header>
      <div className="page-content">{events.length > 0 && <label className="mobile-event-picker">VIEWING EVENT<select value={current?.id || ''} onChange={event => navigate(`/events/${event.target.value}`)}><option value="" disabled>Select an event</option>{events.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {isCoach(user) && <div className="layout-actions">{user?.role === 'admin' && <Link className="button button-outline" to="/manage/accounts">Account roles</Link>}<Link className="button button-blue" to="/manage/new">+ Create event</Link></div>}
      <Outlet context={{ user, authReady, events, refreshEvents, openAuth: () => setShowAuth(true) } satisfies AppContext} />
      <footer>THE LADDER <span>✦</span> EVERY MATCH COUNTS</footer></div></main>
    {showAuth && !user && <AuthDialog onClose={() => setShowAuth(false)} onSuccess={next => { setUser(next); setShowAuth(false); refreshEvents().catch(() => {}); }} />}
  </div>;
}
