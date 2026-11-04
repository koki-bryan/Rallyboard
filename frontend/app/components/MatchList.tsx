import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '~/lib/api';
import { type Event, type Match } from '~/lib/types';
import { PlayerAvatar } from './PlayerAvatar';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

type AuditEntry = { action: string; actor_id: number; snapshot: string; created_at: string };

function auditSummary(snapshot: string) {
  try {
    const record = JSON.parse(snapshot) as { status?: string; sets?: number[][] };
    const sets = record.sets?.map(set => set.join('–')).join(' · ');
    return `${record.status || 'Pending'}${sets ? ` · ${sets}` : ' · No scores'}`;
  } catch {
    return snapshot;
  }
}

type Props = { event: Event; query: string; coach: boolean; onEdit: (match: Match) => void; onChanged: () => Promise<void> };
export function MatchList({ event, query, coach, onEdit, onChanged }: Props) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [error, setError] = useState('');
  const [voidMatch, setVoidMatch] = useState<Match | null>(null);
  const [voidError, setVoidError] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyView, setHistoryView] = useState<{ match: Match; entries: AuditEntry[] } | null>(null);
  const search = query.trim().toLocaleLowerCase();
  const matches = event.matches.filter(match => (filter === 'all' || match.status === filter) && (!search || match.player1.toLocaleLowerCase().includes(search) || match.player2.toLocaleLowerCase().includes(search)));
  async function action(task: () => Promise<void>) { setError(''); try { await task(); } catch (cause) { setError((cause as Error).message); } }
  async function history(match: Match) {
    const entries = await api<AuditEntry[]>(`/matches/${match.id}/audit`);
    setHistoryView({ match, entries });
  }
  async function confirmVoid() {
    if (!voidMatch) return;
    setBusy(true);
    setVoidError('');
    try {
      await api(`/matches/${voidMatch.id}/result`, { method: 'DELETE' });
      await onChanged();
      setVoidMatch(null);
    } catch (cause) {
      setVoidError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <section id="matches" className="mt-4 tabular-nums"><div className="mb-[18px] flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end [&_h2]:my-1 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-[13px] [&_p]:text-muted"><div><div className="text-[10px] font-bold tracking-[2px] text-blue">ON THE TABLE</div><h2>Match results</h2><p>Every matchup, every set.</p></div><div className="flex gap-0.5 rounded-lg bg-blue-soft/60 p-1 [&_button]:rounded-md [&_button]:px-3 [&_button]:py-2 [&_button]:text-[11px] [&_button]:font-bold" aria-label="Filter matches">{(['all', 'completed', 'pending'] as const).map(item => <button key={item} type="button" aria-pressed={filter === item} className={`relative ${filter === item ? 'text-blue' : 'text-muted'}`} onClick={() => setFilter(item)}>{filter === item && <motion.span layoutId="match-filter-indicator" className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ duration: 0.18, ease: 'easeOut' }} />}<span className="relative z-10">{item === 'all' ? 'All' : item === 'completed' ? 'Played' : 'Upcoming'}</span></button>)}</div></div>
    {error && <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{matches.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-muted">{event.status === 'draft' ? 'Matches will appear when the coach generates the schedule.' : search ? 'No matches involve that player.' : 'No matches in this view.'}</div>}{matches.map(match => <article className={`rounded-xl border px-5 py-[18px] ${filter === 'all' && match.status === 'completed' ? 'border-green/35 bg-green-soft shadow-[inset_3px_0_#3f795b]' : 'border-line bg-white'}`} key={match.id}><div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-muted"><span>{match.round_number ? `ROUND ${match.round_number} · MATCH ${match.sequence_number}` : `MATCH #${String(match.id).padStart(3, '0')}`}</span><span className={`flex items-center gap-1.5 [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-current ${match.status === 'completed' ? 'text-green' : 'text-yellow-ink'}`}><i />{match.status === 'completed' ? 'FINAL' : 'TO PLAY'}</span></div>
      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 [&>div]:flex [&>div]:min-w-0 [&>div]:items-center [&>div]:gap-2.5 [&>div:last-child]:flex-row-reverse [&>div:last-child]:justify-end [&>div:last-child]:text-right [&_strong]:truncate [&_strong]:text-[13px]"><div><PlayerAvatar playerId={match.player1_id} name={match.player1} size="md" /><strong className={match.winner_id === match.player1_id ? 'text-green' : ''}>{match.player1}</strong></div><span className="text-[10px] font-bold text-muted">VS</span><div><PlayerAvatar playerId={match.player2_id} name={match.player2} size="md" /><strong className={match.winner_id === match.player2_id ? 'text-green' : ''}>{match.player2}</strong></div></div>
      <div className="flex flex-col items-start justify-between gap-2.5 border-t border-line pt-3 sm:flex-row sm:items-end [&>div:first-child]:min-w-0 [&_strong]:block [&_strong]:text-xs [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-muted">{match.status === 'completed' ? <div><span className="mb-1 block text-[9px] font-bold tracking-wider text-muted">RESULT</span><strong className="text-[13px] font-bold text-green">{match.winner_id === match.player1_id ? match.player1 : match.player2} won · {match.sets.filter(set => (match.winner_id === match.player1_id ? set[0] > set[1] : set[1] > set[0])).length}–{match.sets.filter(set => (match.winner_id === match.player1_id ? set[1] > set[0] : set[0] > set[1])).length} sets</strong><span className="mt-1 block text-[11px] text-green">Set scores: {match.sets.map(set => set.join('–')).join(' · ')}</span><small>Submitted by {event.standings.find(row => row.player_id === match.submitted_by)?.name || `user #${match.submitted_by}`}</small></div> : <div><span className="mb-1 block text-[9px] font-bold tracking-wider text-muted">STATUS</span><strong>Awaiting result</strong><small>Ready when the match is done</small></div>}
      <div className="flex flex-wrap justify-start gap-1 sm:justify-end">{event.can_score && (match.status === 'pending' || coach) && <button className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-bold text-blue hover:underline" onClick={() => onEdit(match)}>{match.status === 'pending' ? 'Enter score' : 'Correct'} ↗</button>}{coach && match.status === 'completed' && <button className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-bold text-muted hover:underline" onClick={() => { setVoidError(''); setVoidMatch(match); }}>Void</button>}{coach && <button className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-bold text-muted hover:underline" onClick={() => action(() => history(match))}>History</button>}</div></div>
    </article>)}</div>
    <AnimatePresence>{voidMatch && <ConfirmDialog key="void" title={`Void ${voidMatch.player1} vs ${voidMatch.player2}?`} description="This removes the recorded score and returns the match to Upcoming. The change remains in match history." confirmLabel="Void result" onClose={() => setVoidMatch(null)} onConfirm={confirmVoid} busy={busy} error={voidError} />}</AnimatePresence>
    <AnimatePresence>
    {historyView && <Modal title={`History: ${historyView.match.player1} vs ${historyView.match.player2}`} onClose={() => setHistoryView(null)}>
      <div className="max-h-[55vh] space-y-3 overflow-y-auto">
        {historyView.entries.length === 0 && <p className="text-sm text-muted">No changes yet.</p>}
        {historyView.entries.map((entry, index) => <div key={index} className="rounded-lg border border-line bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-ink"><span>{entry.action.replaceAll('_', ' ')}</span><span className="text-xs font-normal text-muted">{new Date(entry.created_at).toLocaleString()}</span></div>
          <p className="mt-1 text-xs text-muted">By user #{entry.actor_id}</p>
          <p className="mt-2 text-xs text-ink">{auditSummary(entry.snapshot)}</p>
        </div>)}
      </div>
      <div className="mt-5 flex justify-end border-t border-line pt-4"><button className="rounded-lg bg-blue px-4 py-2 text-sm font-bold text-white" onClick={() => setHistoryView(null)}>Close</button></div>
    </Modal>}
    </AnimatePresence>
  </section>;
}
