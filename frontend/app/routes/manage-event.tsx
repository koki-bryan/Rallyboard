import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AnimatePresence } from "motion/react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "~/lib/api";
import { isCoach, type Event, type User } from "~/lib/types";
import { PlayerAvatar } from "~/components/PlayerAvatar";
import { DeleteEventDialog } from "~/components/DeleteEventDialog";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { PageIntro } from "~/components/PageIntro";
import { useApp } from "./app-layout";

type PendingAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  execute: () => Promise<void>;
};

export default function ManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, authReady, openAuth, refreshEvents } = useApp();
  const [event, setEvent] = useState<Event | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [registeredId, setRegisteredId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const refresh = useCallback(async () => {
    if (eventId) setEvent(await api<Event>(`/events/${eventId}`));
  }, [eventId]);
  useEffect(() => {
    if (!isCoach(user)) return;
    refresh().catch((cause) => setError((cause as Error).message));
    api<User[]>("/users")
      .then(setUsers)
      .catch((cause) => setError((cause as Error).message));
  }, [refresh, user?.role]);
  async function run(task: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await task();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirmPending() {
    if (!pendingAction) return;
    setPendingBusy(true);
    setPendingError("");
    try {
      await pendingAction.execute();
      setPendingAction(null);
    } catch (cause) {
      setPendingError((cause as Error).message);
    } finally {
      setPendingBusy(false);
    }
  }
  function prepare(action: PendingAction) {
    setPendingError("");
    setPendingAction(action);
  }
  if (!authReady)
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>Loading account…</h2>
      </div>
    );
  if (!isCoach(user))
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>Coach access required</h2>
        <p>Sign in as a coach or admin to manage an event.</p>
        {!user && (
          <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" onClick={openAuth}>
            Sign in ↗
          </button>
        )}
      </div>
    );
  if (!event)
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>{error ? "Event unavailable" : "Loading event…"}</h2>
        <p>{error}</p>
      </div>
    );
  const draft = event.status === "draft";
  return (
    <>
      <div className="mb-6 md:mb-[30px] flex flex-col items-start justify-between gap-5 md:flex-row md:items-end [&_h1]:my-2.5 [&_h1]:text-[34px] md:[&_h1]:text-[42px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-1.5px] [&_h1_em]:font-sans [&_h1_em]:font-medium [&_h1_em]:text-blue [&_p]:text-[13px] [&_p]:text-muted">
        <PageIntro key={event.id}>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[2px] text-blue">
            <span className="h-0.5 w-[21px] bg-blue" /> COACH DESK
          </div>
          <h1>
            Manage <em>{event.name}</em>
          </h1>
          <p>
            {draft
              ? "Build the roster, then generate a randomized round robin schedule."
              : "View the event and manage its score access."}
          </p>
        </PageIntro>
        <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" to={`/events/${event.id}`}>
          View event ↗
        </Link>
      </div>
      {error && (
        <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-line bg-white mt-[30px] p-6 [&_label]:block [&_label]:text-[11px] [&_label]:font-bold [&_label]:text-muted">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end [&_h2]:my-1 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-[13px] [&_p]:text-muted">
          <div>
            <div className="text-[10px] font-bold tracking-[2px] text-blue">EVENT ROSTER</div>
            <h2>{event.players.length} players</h2>
            <p>
              {draft
                ? "Add players by name or select registered accounts."
                : "The roster is locked because the schedule has been generated."}
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:rounded-lg [&>div]:border [&>div]:border-line [&>div]:px-2 [&>div]:py-1.5 [&>div]:text-xs [&>span]:text-xs [&>span]:text-muted">
          {event.players.map((player) => (
            <div key={player.id}>
              <PlayerAvatar playerId={player.id} name={player.name} />
              <strong>{player.name}</strong>
              {draft && (
                <button
                  className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-bold text-muted hover:underline"
                  disabled={busy}
                  onClick={() => prepare({
                    title: `Remove ${player.name}?`,
                    description: `This removes ${player.name} from ${event.name}'s draft roster. You can add them again before generating matches.`,
                    confirmLabel: "Remove player",
                    tone: "danger",
                    execute: async () => {
                      await api(`/events/${event.id}/players/${player.id}`, { method: "DELETE" });
                      await refresh();
                    },
                  })}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {event.players.length === 0 && <span>No players added yet.</span>}
        </div>
        {draft && (
          <div className="mt-6 border-t border-line pt-[22px] [&_h3]:my-1 [&_h3]:text-lg [&_p]:mb-4 [&_p]:text-xs [&_p]:text-muted [&_form]:mb-3 [&_form]:flex [&_form]:max-w-[540px] [&_form]:flex-col [&_form]:gap-2.5 md:[&_form]:flex-row md:[&_form]:items-end [&_form_label]:flex-1 [&_small]:mt-2 [&_small]:block [&_small]:text-[11px] [&_small]:text-muted">
            <form
              onSubmit={(form: FormEvent) => {
                form.preventDefault();
                run(async () => {
                  await api(`/events/${event.id}/players`, {
                    method: "POST",
                    body: JSON.stringify({ name: playerName }),
                  });
                  setPlayerName("");
                  await refresh();
                });
              }}
            >
              <label>
                Player name
                <input
                  className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                  required
                  maxLength={100}
                  placeholder="e.g. Floyd"
                  value={playerName}
                  onChange={(input) => setPlayerName(input.target.value)}
                />
              </label>
              <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" disabled={busy}>
                Add player
              </button>
            </form>
            <form
              onSubmit={(form: FormEvent) => {
                form.preventDefault();
                run(async () => {
                  await api(`/events/${event.id}/players`, {
                    method: "POST",
                    body: JSON.stringify({ user_id: Number(registeredId) }),
                  });
                  setRegisteredId("");
                  await refresh();
                });
              }}
            >
              <label>
                Or select a registered account
                <select
                  className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                  required
                  value={registeredId}
                  onChange={(input) => setRegisteredId(input.target.value)}
                >
                  <option value="">Choose account</option>
                  {users
                    .filter(
                      (account) =>
                        !event.players.some(
                          (player) => player.id === account.id,
                        ),
                    )
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft"
                disabled={busy || !registeredId}
              >
                Add account
              </button>
            </form>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white"
              disabled={busy || event.players.length < 2}
              onClick={() => prepare({
                title: "Generate round robin matches?",
                description: `This creates every matchup for ${event.players.length} players and locks the roster for ${event.name}.`,
                confirmLabel: "Generate matches",
                tone: "primary",
                execute: async () => {
                  await api(`/events/${event.id}/generate-schedule`, { method: "POST" });
                  await refresh();
                  await refreshEvents();
                },
              })}
            >
              Generate round robin schedule ↗
            </button>
            <small>
              Each pair will meet once. Generating the schedule locks the
              roster.
            </small>
          </div>
        )}
      </section>
      <section className="overflow-hidden rounded-xl border border-line bg-white mt-[30px] p-6 [&_label]:block [&_label]:text-[11px] [&_label]:font-bold [&_label]:text-muted">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end [&_h2]:my-1 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-[13px] [&_p]:text-muted">
          <div>
            <div className="text-[10px] font-bold tracking-[2px] text-blue">SCORE ACCESS</div>
            <h2>Event password</h2>
            <p>
              {event.has_password
                ? "Changing it removes previous scoring access."
                : "Set a password so signed-in people can view the event and enter scores."}
            </p>
          </div>
        </div>
        <form
          className="mt-6 flex flex-col items-stretch gap-3 border-t border-line pt-5 md:flex-row md:items-end [&_label]:flex-1"
          onSubmit={(form: FormEvent) => {
            form.preventDefault();
            const nextPassword = password;
            prepare({
              title: event.has_password ? "Change event password?" : "Set event password?",
              description: event.has_password
                ? "Everyone who previously entered this event password will need the new password to view and score this event."
                : "Signed-in members will need this password to view and score the event.",
              confirmLabel: event.has_password ? "Change password" : "Set password",
              tone: "primary",
              execute: async () => {
                await api(`/events/${event.id}/password`, {
                  method: "PUT",
                  body: JSON.stringify({ password: nextPassword }),
                });
                setPassword("");
                await refresh();
              },
            });
          }}
        >
          <label>
            {event.has_password ? "New password" : "Password"}
            <input
              className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              type="password"
              minLength={6}
              maxLength={128}
              required
              placeholder="Event password"
              value={password}
              onChange={(input) => setPassword(input.target.value)}
            />
          </label>
          <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" disabled={busy}>
            Save password
          </button>
        </form>
      </section>
      <section className="overflow-hidden rounded-xl border border-line bg-white mt-[30px] flex flex-col items-start justify-between gap-[18px] border-red/20 bg-red-soft/30 px-6 py-[22px] md:flex-row md:items-center [&_h2]:my-1 [&_h2]:text-[19px] [&_p]:text-xs [&_p]:text-muted">
        <div>
          <div className="text-[10px] font-bold tracking-[2px] text-blue">DANGER ZONE</div>
          <h2>Delete this event</h2>
          <p>Removes its roster, match scores, and history permanently.</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-red text-white"
          disabled={busy}
          onClick={() => setShowDelete(true)}
        >
          Delete event
        </button>
      </section>
      <AnimatePresence>
      {showDelete && (
        <DeleteEventDialog
          event={event}
          onClose={() => setShowDelete(false)}
          onDeleted={async () => { await refreshEvents(); navigate("/"); }}
        />
      )}
      </AnimatePresence>
      <AnimatePresence>
      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.title}
          description={pendingAction.description}
          confirmLabel={pendingAction.confirmLabel}
          tone={pendingAction.tone}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmPending}
          busy={pendingBusy}
          error={pendingError}
        />
      )}
      </AnimatePresence>
    </>
  );
}
