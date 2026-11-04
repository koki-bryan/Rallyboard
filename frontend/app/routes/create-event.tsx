import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "~/lib/api";
import { isCoach } from "~/lib/types";
import { useApp } from "./app-layout";

export default function CreateEvent() {
  const { user, authReady, openAuth, refreshEvents } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bestOf, setBestOf] = useState(5);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: FormEvent) {
    form.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await api<{ id: string }>("/events", {
        method: "POST",
        body: JSON.stringify({
          name,
          best_of: bestOf,
          event_password: password,
        }),
      });
      await refreshEvents();
      navigate(`/manage/events/${created.id}`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
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
        <p>Sign in as a coach or admin to create an event.</p>
        {!user && (
          <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" onClick={openAuth}>
            Sign in ↗
          </button>
        )}
      </div>
    );
  return (
    <>
      <div className="mb-6 md:mb-[30px] flex flex-col items-start justify-between gap-5 md:flex-row md:items-end [&_h1]:my-2.5 [&_h1]:text-[34px] md:[&_h1]:text-[42px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-1.5px] [&_h1_em]:font-sans [&_h1_em]:font-medium [&_h1_em]:text-blue [&_p]:text-[13px] [&_p]:text-muted">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[2px] text-blue">
            <span className="h-0.5 w-[21px] bg-blue" /> COACH DESK
          </div>
          <h1>
            Create an <em>event</em>
          </h1>
          <p>Start with the event details. Add players on the next page.</p>
        </div>
        <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" to="/">
          Cancel
        </Link>
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-white mt-[30px] p-6 [&_label]:block [&_label]:text-[11px] [&_label]:font-bold [&_label]:text-muted max-w-[760px] [&_h2]:my-2 [&_h2]:text-[22px]">
        <div className="text-[10px] font-bold tracking-[2px] text-blue">NEW COMPETITION</div>
        <h2>Event details</h2>
        <p className="mb-4 text-xs text-muted">
          The event begins as a draft. You can add players before generating the
          match schedule.
        </p>
        {error && (
          <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="mb-[21px] grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
            <label>
              Event name
              <input
                className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                required
                maxLength={120}
                placeholder="e.g. November Club Round Robin"
                value={name}
                onChange={(input) => setName(input.target.value)}
              />
            </label>
            <label>
              Match format
              <select
                className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                value={bestOf}
                onChange={(input) => setBestOf(Number(input.target.value))}
              >
                {[3, 5, 7].map((number) => (
                  <option key={number} value={number}>
                    Best of {number}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mb-[21px] block">
            Event password
            <input
              className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              type="password"
              minLength={6}
              maxLength={128}
              required
              placeholder="Share with people who will enter scores"
              value={password}
              onChange={(input) => setPassword(input.target.value)}
            />
          </label>
          <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" disabled={busy}>
            Create event ↗
          </button>
        </form>
      </section>
    </>
  );
}
