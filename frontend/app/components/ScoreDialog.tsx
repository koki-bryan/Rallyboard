import { useState, type FormEvent } from 'react';
import { api } from '~/lib/api';
import type { Match } from '~/lib/types';

type Props = { match: Match; bestOf: number; onClose: () => void; onSaved: () => Promise<void> };
export function ScoreDialog({ match, bestOf, onClose, onSaved }: Props) {
  // Keep input text as text while editing. Number('') is 0, which made zero impossible to erase.
  const [scores, setScores] = useState<string[][]>(() => match.sets.length
    ? match.sets.map(set => set.map(String))
    : Array.from({ length: Math.floor(bestOf / 2) + 1 }, () => ['11', '0']));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(setIndex: number, side: number, value: string) {
    setScores(current => current.map((set, index) => index === setIndex ? set.map((point, column) => column === side ? value : point) : set));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (scores.some(set => set.some(point => point.trim() === ''))) throw new Error('Enter a score for every player in each set.');
      await api(`/matches/${match.id}/result`, { method: match.status === 'completed' ? 'PUT' : 'POST', body: JSON.stringify({ sets: scores.map(set => set.map(Number)) }) });
      await onSaved();
      onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="modal score-modal" role="dialog" aria-modal="true" aria-label="Enter match result" onClick={event => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
    <div className="section-kicker">MATCH RESULT</div><h2>{match.player1} <em>vs</em> {match.player2}</h2><p>First to {Math.floor(bestOf / 2) + 1} sets wins. Each set needs 11 points and a two-point lead.</p>
    {error && <div className="modal-error" role="alert">{error}</div>}
    <form onSubmit={submit}><div className="score-head"><span>SET</span><span>{match.player1}</span><span>{match.player2}</span></div>
      {scores.map((set, index) => <div className="score-row" key={index}><span>{String(index + 1).padStart(2, '0')}</span>{[0, 1].map(side => <input className="field" key={side} aria-label={`Set ${index + 1} ${side === 0 ? match.player1 : match.player2} points`} type="number" min="0" step="1" required value={set[side]} onChange={event => update(index, side, event.target.value)} />)}</div>)}
      <div className="score-controls"><button type="button" disabled={scores.length >= bestOf} onClick={() => setScores(current => [...current, ['11', '0']])}>+ Add set</button><button type="button" disabled={scores.length <= Math.floor(bestOf / 2) + 1} onClick={() => setScores(current => current.slice(0, -1))}>− Remove set</button></div>
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-red" disabled={busy}>Save result ↗</button></div>
    </form></section></div>;
}
