import { Link } from "react-router";
import { useApp } from "./app-layout";
import { isCoach } from "~/lib/types";
export default function Home() {
  const { events, user, openAuth } = useApp();
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
      </div>
      {events.length ? (
        <section className="overflow-hidden rounded-xl border border-line bg-white p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end [&_h2]:my-1 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-[13px] [&_p]:text-muted">
            <div>
              <div className="text-[10px] font-extrabold tracking-[2px] text-blue">EVENTS</div>
              <h2>Choose a competition</h2>
              <p>Open an event to see its standings and matches.</p>
            </div>
          </div>
          <div className="grid gap-2.5 [&>a]:flex [&>a]:flex-wrap [&>a]:items-center [&>a]:gap-3 [&>a]:rounded-lg [&>a]:border [&>a]:border-line [&>a]:p-3 [&>a]:text-ink [&>a]:no-underline [&>a:hover]:bg-surface [&_strong]:flex-1 [&_strong]:text-sm [&_b]:text-blue">
            {events.map((item) => (
              <Link key={item.id} to={`/events/${item.id}`}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-soft text-[21px] text-blue">✦</span>
                <strong>{item.name}</strong>
                <span>
                  {item.best_of ? `Best of ${item.best_of} · ${item.status}` : "Password required"}
                </span>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
          <div className="text-[50px] text-yellow">✦</div>
          <h2>The table is ready.</h2>
          <p>
            No events have been created yet. A coach can start a new round
            robin.
          </p>
          {isCoach(user) ? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" to="/manage/new">
              Create an event ↗
            </Link>
          ) : (
            !user && (
              <button className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" onClick={openAuth}>
                Sign in to get started ↗
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}
