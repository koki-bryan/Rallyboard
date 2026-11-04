import { Link } from 'react-router';
import { useApp } from './app-layout';
import { isCoach } from '~/lib/types';
export default function Home() {
  const { events, user, openAuth } = useApp();
  return <><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CLUB COMPETITION</div><h1>Rankings <em>&amp;</em> results</h1><p>Follow the round robin. See every set, point, and place.</p></div></div>
    {events.length ? <section className="panel event-directory"><div className="section-head"><div><div className="section-kicker">EVENTS</div><h2>Choose a competition</h2><p>Open an event to see its standings and matches.</p></div></div><div className="directory-list">{events.map(item => <Link key={item.id} to={`/events/${item.id}`}><span className="event-strip-icon">✦</span><strong>{item.name}</strong><span>Best of {item.best_of} · {item.status}</span><b>↗</b></Link>)}</div></section> : <div className="welcome-panel"><div className="welcome-icon">✦</div><h2>The table is ready.</h2><p>No events have been created yet. A coach can start a new round robin.</p>{isCoach(user) ? <Link className="button button-blue" to="/manage/new">Create an event ↗</Link> : !user && <button className="button button-blue" onClick={openAuth}>Sign in to get started ↗</button>}</div>}
  </>;
}
