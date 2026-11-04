import { useState } from 'react';
import { api } from '~/lib/api';
import { initials, type Event, type Match } from '~/lib/types';

type Props = { event: Event; coach: boolean; onEdit: (match: Match) => void; onChanged: () => Promise<void> };
export function MatchList({ event, coach, onEdit, onChanged }: Props) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [error, setError] = useState('');
  const matches = event.matches.filter(match => filter === 'all' || match.status === filter);
  async function action(task: () => Promise<void>) { setError(''); try { await task(); } catch (cause) { setError((cause as Error).message); } }
  async function history(match: Match) {
    const entries = await api<Array<{ action: string; actor_id: number; snapshot: string; created_at: string }>>(`/matches/${match.id}/audit`);
    alert(entries.map(entry => `${new Date(entry.created_at).toLocaleString()} · ${entry.action} by user #${entry.actor_id}\n${entry.snapshot}`).join('\n\n') || 'No changes yet');
  }
  return <section id="matches" className="matches-section"><div className="section-head"><div><div className="section-kicker">ON THE TABLE</div><h2>Match results</h2><p>Every matchup, every set.</p></div><div className="segmented" aria-label="Filter matches">{(['all', 'completed', 'pending'] as const).map(item => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'completed' ? 'Played' : 'Upcoming'}</button>)}</div></div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <div className="match-grid">{matches.length === 0 && <div className="empty-state">{event.status === 'draft' ? 'Matches will appear when the coach generates the schedule.' : 'No matches in this view.'}</div>}{matches.map(match => <article className="match-card" key={match.id}><div className="match-card-top"><span>{match.round_number ? `ROUND ${match.round_number} · MATCH ${match.sequence_number}` : `MATCH #${String(match.id).padStart(3, '0')}`}</span><span className={`match-status ${match.status === 'completed' ? 'finished' : ''}`}><i />{match.status === 'completed' ? 'FINAL' : 'TO PLAY'}</span></div>
      <div className="match-players"><div><span className="match-avatar">{initials(match.player1)}</span><strong className={match.winner_id === match.player1_id ? 'winner' : ''}>{match.player1}</strong></div><span className="versus">VS</span><div><span className="match-avatar alt">{initials(match.player2)}</span><strong className={match.winner_id === match.player2_id ? 'winner' : ''}>{match.player2}</strong></div></div>
      <div className="match-bottom">{match.status === 'completed' ? <div><span className="set-label">SET SCORES</span><strong>{match.sets.map(set => set.join('–')).join('  ·  ')}</strong><small>Submitted by {event.standings.find(row => row.player_id === match.submitted_by)?.name || `user #${match.submitted_by}`}</small></div> : <div><span className="set-label">STATUS</span><strong>Awaiting result</strong><small>Ready when the match is done</small></div>}
      <div className="match-actions">{event.can_score && (match.status === 'pending' || coach) && <button className="action-button" onClick={() => onEdit(match)}>{match.status === 'pending' ? 'Enter score' : 'Correct'} ↗</button>}{coach && match.status === 'completed' && <button className="action-muted" onClick={() => action(async () => { await api(`/matches/${match.id}/result`, { method: 'DELETE' }); await onChanged(); })}>Void</button>}{coach && <button className="action-muted" onClick={() => action(() => history(match))}>History</button>}</div></div>
    </article>)}</div>
  </section>;
}
