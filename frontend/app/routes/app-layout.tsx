import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router";
import { AuthDialog } from "~/components/AuthDialog";
import { api } from "~/lib/api";
import { initials, isCoach, type EventItem, type User } from "~/lib/types";

export type AppContext = {
  user: User | null;
  authReady: boolean;
  events: EventItem[];
  refreshEvents: () => Promise<void>;
  openAuth: () => void;
};
export function useApp() {
  return useOutletContext<AppContext>();
}

export default function AppLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  async function refreshEvents() {
    setEvents(await api<EventItem[]>("/events"));
  }
  useEffect(() => {
    api<User | null>("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setAuthReady(true));
    refreshEvents().catch((cause) => setError((cause as Error).message));
  }, []);
  const current = events.find(
    (item) =>
      location.pathname.startsWith(`/events/${item.id}`) ||
      location.pathname.startsWith(`/manage/events/${item.id}`),
  );
  return (
    <div className="flex min-h-screen bg-surface font-sans text-ink">
      <aside className="hidden md:flex w-[210px] lg:w-[248px] shrink-0 flex-col border-r border-line bg-blue-soft/60 px-[18px] pb-[22px] pt-[31px]">
        <Link to="/" className="flex items-center gap-3 px-[11px] pb-12 text-ink no-underline">
          <div className="grid size-[35px] shrink-0 place-items-center rounded-full border-2 border-blue bg-white">
            <span className="size-2 rounded-full bg-red" />
          </div>
          <div>
            <strong className="block text-[21px] font-extrabold tracking-tight">
              the ladder<span className="text-yellow-ink">.</span>
            </strong>
            <small className="mt-1 block text-[8px] font-extrabold tracking-[2px] text-blue">TABLE TENNIS CLUB</small>
          </div>
        </Link>
        <div className="mb-4 px-[15px] text-[10px] font-extrabold tracking-[1.7px] text-muted">WORKSPACE</div>
        <nav className="flex flex-col" aria-label="Events">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex justify-between rounded-lg bg-blue/10 px-[15px] py-3 text-[13px] font-bold text-blue no-underline ${isActive ? "bg-blue/15" : ""}`
            }
          >
            Overview <span>↗</span>
          </NavLink>
          <div className="mb-4 px-[15px] text-[10px] font-extrabold tracking-[1.7px] text-muted mb-3 mt-8">EVENTS</div>
          {events.length === 0 && <p className="px-3.5 text-[13px] text-muted">No events yet</p>}
          {events.map((item) => (
            <NavLink
              key={item.id}
              to={`/events/${item.id}`}
              className={({ isActive }) =>
                `flex w-full items-center gap-2.5 rounded-lg border-0 px-3.5 py-3 text-left text-[13px] no-underline hover:bg-white/70 ${isActive ? "bg-white font-bold text-ink shadow-sm" : "bg-transparent text-muted"}`
              }
            >
              <span className="size-[7px] shrink-0 rounded-full bg-blue/40" />
              <span className="truncate">{item.name}</span>
              <span className="ml-auto text-[19px] text-muted">›</span>
            </NavLink>
          ))}
        </nav>
        {user?.role === "admin" && (
          <NavLink to="/manage/accounts" className="flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-3.5 py-3 text-left text-[13px] text-muted no-underline hover:bg-white/70">
            <span className="size-[7px] shrink-0 rounded-full bg-blue/40" />
            Account roles<span className="ml-auto text-[19px] text-muted">›</span>
          </NavLink>
        )}
        <div className="mt-auto flex items-center gap-3 border-t border-line px-3 pt-[22px] [&_strong]:text-xs [&_p]:mt-1 [&_p]:text-[11px] [&_p]:text-muted">
          <span className="text-[28px] text-yellow-ink">✦</span>
          <div>
            <strong>Play every point.</strong>
            <p>Every match counts.</p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-[62px] md:h-[73px] items-center justify-between gap-5 border-b border-line bg-white px-[17px] md:px-[25px] xl:px-[42px]">
          <Link to="/" className="block md:hidden text-xl font-extrabold tracking-tight text-ink no-underline [&_span]:text-yellow-ink">
            the ladder<span>.</span>
          </Link>
          <div className="hidden md:block text-xs text-muted [&_span]:mx-3 [&_span]:text-muted [&_strong]:text-ink">
            Club rankings <span>/</span>{" "}
            <strong>
              {current?.name ||
                (location.pathname.includes("manage")
                  ? "Coach desk"
                  : "Overview")}
            </strong>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {user ? (
              <>
                <span className="grid size-[31px] shrink-0 place-items-center rounded-full bg-blue-soft text-[11px] font-extrabold text-blue">{initials(user.name)}</span>
                <span className="hidden md:inline font-bold">{user.name}</span>
                <button
                  className="ml-2 border-0 bg-transparent text-xs text-muted hover:text-red"
                  onClick={async () => {
                    try {
                      await api("/auth/logout", { method: "POST" });
                      setUser(null);
                      navigate("/");
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white"
                onClick={() => setShowAuth(true)}
              >
                Sign in <span>↗</span>
              </button>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-[1320px] px-[15px] py-[25px] md:px-[25px] md:py-[30px] xl:px-[42px] xl:py-[38px]">
          {events.length > 0 && (
            <label className="mb-[22px] block text-[9px] font-extrabold tracking-wider text-muted md:hidden [&_select]:mt-2 [&_select]:block [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-line [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-[13px] [&_select]:font-bold [&_select]:text-ink">
              VIEWING EVENT
              <select
                value={current?.id || ""}
                onChange={(event) => navigate(`/events/${event.target.value}`)}
              >
                <option value="" disabled>
                  Select an event
                </option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && (
            <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {isCoach(user) && (
            <div className="mb-[18px] flex flex-wrap justify-end gap-2">
              {user?.role === "admin" && (
                <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" to="/manage/accounts">
                  Account roles
                </Link>
              )}
              <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-extrabold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" to="/manage/new">
                + Create event
              </Link>
            </div>
          )}
          <Outlet
            context={
              {
                user,
                authReady,
                events,
                refreshEvents,
                openAuth: () => setShowAuth(true),
              } satisfies AppContext
            }
          />
          <footer>
            THE LADDER <span>✦</span> EVERY MATCH COUNTS
          </footer>
        </div>
      </main>
      {showAuth && !user && (
        <AuthDialog
          onClose={() => setShowAuth(false)}
          onSuccess={(next) => {
            setUser(next);
            setShowAuth(false);
            refreshEvents().catch(() => {});
          }}
        />
      )}
    </div>
  );
}
