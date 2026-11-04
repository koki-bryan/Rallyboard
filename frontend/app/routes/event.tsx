import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MatchList } from "~/components/MatchList";
import { PlayerSearch } from "~/components/PlayerSearch";
import { ScoreDialog } from "~/components/ScoreDialog";
import { Standings } from "~/components/Standings";
import { api } from "~/lib/api";
import { isCoach, type Event, type Match } from "~/lib/types";
import { useApp } from "./app-layout";

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, openAuth, refreshEvents } = useApp();
  const coach = isCoach(user);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [editing, setEditing] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!eventId) return;
    setEvent(await api<Event>(`/events/${eventId}`));
  }, [eventId]);
  useEffect(() => {
    setEvent(null);
    refresh().catch((cause) => setError((cause as Error).message));
  }, [refresh, user?.id]);
  async function join(eventForm: FormEvent) {
    eventForm.preventDefault();
    if (!event) return;
    setError("");
    setBusy(true);
    try {
      await api(`/events/${event.id}/join`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeEvent() {
    if (
      !event ||
      !window.confirm(
        `Delete ${event.name}? This permanently removes its roster, matches, scores, and history.`,
      )
    )
      return;
    setError("");
    setBusy(true);
    try {
      await api(`/events/${event.id}`, { method: "DELETE" });
      await refreshEvents();
      navigate("/");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!event)
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>{error ? "Event unavailable" : "Loading event…"}</h2>
        <p>{error}</p>
      </div>
    );
  const played = event.matches.filter(
    (match) => match.status === "completed",
  ).length;
  const leader = played ? event.standings[0] : null;
  return (
    <>
      <div className="mb-6 md:mb-[30px] flex flex-col items-start justify-between gap-5 md:flex-row md:items-end [&_h1]:my-2.5 [&_h1]:text-[34px] md:[&_h1]:text-[42px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-1.5px] [&_h1_em]:font-serif [&_h1_em]:font-normal [&_h1_em]:text-blue [&_p]:text-[13px] [&_p]:text-muted">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[2px] text-blue">
            <span className="h-0.5 w-[21px] bg-blue" /> CLUB COMPETITION
          </div>
          <h1>
            Rankings <em>&amp;</em> results
          </h1>
          <p>Follow the round robin. See every set, point, and place.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {coach && (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft"
              to={`/manage/events/${event.id}`}
            >
              Manage event
            </Link>
          )}
          {coach && (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-red text-white"
              disabled={busy}
              onClick={removeEvent}
            >
              Delete event
            </button>
          )}
          {event.can_score && event.status !== "draft" && (
            <a className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" href="#matches">
              Record a match ↗
            </a>
          )}
        </div>
      </div>
      {error && (
        <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5 rounded-xl border border-line bg-white px-5 py-3 md:flex-nowrap [&>div:nth-child(2)]:flex [&>div:nth-child(2)]:flex-col [&>div:nth-child(2)]:gap-0.5 [&>div:nth-child(2)>span]:text-[9px] [&>div:nth-child(2)>span]:font-extrabold [&>div:nth-child(2)>span]:tracking-wider [&>div:nth-child(2)>span]:text-muted [&_strong]:text-[13px]">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-soft text-[21px] text-blue">✦</div>
        <div>
          <span>NOW VIEWING</span>
          <strong>{event.name}</strong>
        </div>
        <div className="ml-0 flex w-full items-center justify-between gap-2 border-t border-line pt-2.5 text-[11px] text-muted md:ml-auto md:w-auto md:justify-start md:gap-5 md:border-0 md:pt-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-current ${event.status === "complete" ? "bg-green-soft text-green" : event.status === "draft" ? "bg-yellow-soft text-ink" : "bg-blue-soft text-blue"}`}
          >
            <i />
            {event.status === "complete"
              ? "Completed"
              : event.status === "draft"
                ? "Draft"
                : "In progress"}
          </span>
          <span>Best of {event.best_of}</span>
          <span>{event.standings.length} players</span>
        </div>
      </div>
      {user && !event.can_score && (
        <section className="mb-[18px] flex flex-col items-start justify-between gap-5 rounded-xl border border-blue/20 bg-blue-soft p-5 lg:flex-row lg:items-center [&_h2]:my-1 [&_h2]:text-[19px] [&_h2]:font-bold [&_p]:max-w-[430px] [&_p]:text-[11px] [&_p]:text-muted [&_form]:flex [&_form]:w-full [&_form]:flex-wrap [&_form]:gap-2 lg:[&_form]:w-auto  [&_small]:text-[11px] [&_small]:text-red">
          <div>
            <div className="text-[10px] font-extrabold tracking-[2px] text-blue">EVENT ACCESS</div>
            <h2>Have the event password?</h2>
            <p>
              Enter it once to unlock score entry. You can view standings
              without joining.
            </p>
          </div>
          <form onSubmit={join}>
            <input
              className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              type="password"
              minLength={6}
              required
              placeholder="Event password"
              value={password}
              onChange={(input) => setPassword(input.target.value)}
            />
            <button
              className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white"
              disabled={busy || !event.has_password}
            >
              Unlock scoring ↗
            </button>
          </form>
          {!event.has_password && (
            <small>The coach needs to set a password first.</small>
          )}
        </section>
      )}
      {!user && (
        <div className="mb-[18px] flex flex-wrap items-center gap-3 rounded-lg border border-yellow/25 bg-yellow-soft px-[18px] py-3 text-xs text-ink [&_strong]:text-[13px] [&_span]:min-w-[220px] [&_span]:flex-1 [&_a]:font-extrabold [&_a]:text-yellow-ink">
          <strong>Want to enter scores?</strong>
          <span>Sign in, then enter the event password to unlock scoring.</span>
          <button className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-extrabold text-blue hover:underline" onClick={openAuth}>
            Sign in ↗
          </button>
        </div>
      )}
      {event.status === "draft" && (
        <div className="mb-[18px] flex flex-wrap items-center gap-3 rounded-lg border border-yellow/25 bg-yellow-soft px-[18px] py-3 text-xs text-ink [&_strong]:text-[13px] [&_span]:min-w-[220px] [&_span]:flex-1 [&_a]:font-extrabold [&_a]:text-yellow-ink">
          <strong>Roster in progress</strong>
          <span>
            {event.players.length} player{event.players.length === 1 ? "" : "s"}{" "}
            added. Matches appear after the coach generates the schedule.
          </span>
          {coach && (
            <Link to={`/manage/events/${event.id}`}>Manage roster ↗</Link>
          )}
        </div>
      )}
      <div className="mb-[27px] grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-4 [&>div:last-child]:col-span-2 lg:[&>div:last-child]:col-span-1">
        <div className="min-h-[145px] overflow-hidden rounded-xl px-4 py-4 lg:min-h-[176px] lg:px-[22px] lg:py-[18px] [&_p]:mt-2 [&_p]:text-[11px] [&_p]:text-muted bg-blue-soft">
          <div className="flex items-center justify-between text-[10px] font-extrabold tracking-[1.5px] text-blue">
            <span>01 / MATCHES PLAYED</span>
            <span className="text-[17px] font-normal">↗</span>
          </div>
          <div className="mt-4 text-[34px] lg:text-[43px] font-extrabold leading-tight tracking-[-2px] [&_span]:text-2xl [&_span]:text-muted">
            {played}
            <span>/{event.matches.length}</span>
          </div>
          <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-blue/20 [&>div]:h-full [&>div]:rounded-full [&>div]:bg-blue">
            <div
              style={{
                width: `${event.matches.length ? (played / event.matches.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p>{event.matches.length - played} matches remaining</p>
        </div>
        <div className="min-h-[145px] overflow-hidden rounded-xl px-4 py-4 lg:min-h-[176px] lg:px-[22px] lg:py-[18px] [&_p]:mt-2 [&_p]:text-[11px] [&_p]:text-muted bg-yellow-soft">
          <div className="flex items-center justify-between text-[10px] font-extrabold tracking-[1.5px] text-yellow-ink">
            <span>02 / CURRENT LEADER</span>
            <span className="text-[17px] font-normal">★</span>
          </div>
          <div className="mt-4 text-[34px] lg:text-[43px] font-extrabold leading-tight tracking-[-2px] [&_span]:text-2xl [&_span]:text-muted truncate text-[23px] lg:text-[35px]">{leader?.name || "—"}</div>
          <p>
            {leader
              ? `${leader.wins}–${leader.losses} record · ${leader.set_difference >= 0 ? "+" : ""}${leader.set_difference} set difference`
              : "Results will appear here"}
          </p>
        </div>
        <div className="min-h-[145px] overflow-hidden rounded-xl px-4 py-4 lg:min-h-[176px] lg:px-[22px] lg:py-[18px] [&_p]:mt-2 [&_p]:text-[11px] [&_p]:text-muted border border-line bg-white">
          <div className="flex items-center justify-between text-[10px] font-extrabold tracking-[1.5px] text-blue">
            <span>03 / TOTAL POINTS</span>
            <span className="text-[17px] font-normal">✳</span>
          </div>
          <div className="mt-4 text-[34px] lg:text-[43px] font-extrabold leading-tight tracking-[-2px] [&_span]:text-2xl [&_span]:text-muted">
            {event.standings.reduce((sum, row) => sum + row.points_won, 0)}
          </div>
          <p>Scored across all completed matches</p>
        </div>
      </div>
      <Standings rows={event.standings} query={playerSearch} />
      <PlayerSearch
        players={event.players}
        value={playerSearch}
        onChange={setPlayerSearch}
      />
      <MatchList
        event={event}
        query={playerSearch}
        coach={coach}
        onEdit={setEditing}
        onChanged={refresh}
      />
      {editing && (
        <ScoreDialog
          key={editing.id}
          match={editing}
          bestOf={event.best_of}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
