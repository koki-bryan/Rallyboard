import { useState, type FormEvent } from 'react';
import { api } from '~/lib/api';
import { scoreError } from '~/lib/scoreValidation';
import type { Match } from '~/lib/types';

type Props = { match: Match; bestOf: number; onClose: () => void; onSaved: () => Promise<void> };
export function ScoreDialog({ match, bestOf, onClose, onSaved }: Props) {
  // Keep input text as text while editing. Number('') is 0, which made zero impossible to erase.
  const [scores, setScores] = useState<string[][]>(() => match.sets.length
    ? match.sets.map(set => set.map(String))
    : Array.from({ length: Math.floor(bestOf / 2) + 1 }, () => ['', '']));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const validationError = scoreError(scores, bestOf);
  function update(setIndex: number, side: number, value: string) {
    setError('');
    setScores(current => current.map((set, index) => index === setIndex ? set.map((point, column) => column === side ? value : point) : set));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (validationError) return;
    setError(''); setBusy(true);
    try {
      await api(`/matches/${match.id}/result`, { method: match.status === 'completed' ? 'PUT' : 'POST', body: JSON.stringify({ sets: scores.map(set => set.map(Number)) }) });
      await onSaved();
      onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/60 p-[18px] tabular-nums" onClick={onClose}><section className="relative max-h-[90vh] w-full max-w-[440px] overflow-auto rounded-xl bg-white p-[30px] shadow-2xl [&_h2]:my-2 [&_h2]:text-[28px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-muted [&_form>label]:my-4 [&_form>label]:block [&_form>label]:text-[11px] [&_form>label]:font-bold [&_form>label]:text-muted  max-w-[500px] [&_h2_em]:font-sans [&_h2_em]:font-medium [&_h2_em]:text-blue" role="dialog" aria-modal="true" aria-label="Enter match result" onClick={event => event.stopPropagation()}><button className="absolute right-5 top-4 border-0 bg-transparent text-2xl text-muted" aria-label="Close" onClick={onClose}>×</button>
    <div className="text-[10px] font-bold tracking-[2px] text-blue">MATCH RESULT</div><h2>{match.player1} <em>vs</em> {match.player2}</h2>
    {error && <div className="mb-2.5 rounded-md bg-red-soft px-3 py-2.5 text-xs text-red" role="alert">{error}</div>}
    <form onSubmit={submit}><div className="my-3 grid grid-cols-[60px_1fr_1fr] items-center gap-3 text-[9px] font-bold tracking-wider text-muted"><span>SET</span><span>{match.player1}</span><span>{match.player2}</span></div>
      {scores.map((set, index) => <div className="mb-2 grid grid-cols-[60px_1fr_1fr] items-center gap-3 [&_span]:text-[13px] [&_span]:font-bold [&_span]:text-blue" key={index}><span>{String(index + 1).padStart(2, '0')}</span>{[0, 1].map(side => <input className="block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" key={side} aria-label={`Set ${index + 1} ${side === 0 ? match.player1 : match.player2} points`} type="number" inputMode="numeric" min="0" step="1" required value={set[side]} onChange={event => update(index, side, event.target.value)} />)}</div>)}
      <div className="my-4 flex gap-4 [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[11px] [&_button]:font-bold [&_button]:text-blue [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40"><button type="button" disabled={scores.length >= bestOf} onClick={() => { setError(''); setScores(current => [...current, ['', '']]); }}>+ Add set</button><button type="button" disabled={scores.length <= Math.floor(bestOf / 2) + 1} onClick={() => { setError(''); setScores(current => current.slice(0, -1)); }}>− Remove set</button></div>
      {validationError && <p className="rounded-lg bg-yellow-soft px-3 py-2 text-xs text-yellow-ink" aria-live="polite">{validationError}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" onClick={onClose}>Cancel</button><button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || Boolean(validationError)}>Save result ↗</button></div>
    </form></section></div>;
}
