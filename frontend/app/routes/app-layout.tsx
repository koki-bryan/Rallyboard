import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router";
import { AuthDialog } from "~/components/AuthDialog";
import { BrandLogo } from "~/components/BrandLogo";
import { Modal } from "~/components/Modal";
import { Sidebar } from "~/components/Sidebar";
import { api } from "~/lib/api";
import { initials, isCoach, type EventItem, type User } from "~/lib/types";

export type AppContext = {
  user: User | null;
  setUser: (user: User | null) => void;
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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  async function refreshEvents() {
    setEvents(await api<EventItem[]>("/events"));
  }
  async function signOut() {
    setSigningOut(true);
    setAccountError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setShowAccountMenu(false);
      setUser(null);
      navigate("/");
      refreshEvents().catch((cause) => setError((cause as Error).message));
    } catch (cause) {
      if (showAccountMenu) setAccountError((cause as Error).message);
      else setError((cause as Error).message);
    } finally {
      setSigningOut(false);
    }
  }
  useEffect(() => {
    api<User | null>("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setAuthReady(true));
    refreshEvents().catch((cause) => setError((cause as Error).message));
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);
  const current = events.find(
    (item) =>
      location.pathname.startsWith(`/events/${item.id}`) ||
      location.pathname.startsWith(`/manage/events/${item.id}`),
  );
  return (
    <div className="flex min-h-screen md:h-dvh md:min-h-0 md:overflow-hidden bg-surface font-sans text-ink">
      <Sidebar events={events} user={user} />
      <main ref={mainRef} className="min-w-0 flex-1 md:h-dvh md:min-h-0 md:overflow-y-auto">
        <header className="flex h-[62px] md:h-[73px] md:sticky md:top-0 md:z-10 items-center justify-between gap-5 border-b border-line bg-white px-[17px] md:px-[25px] xl:px-[42px]">
          <Link to="/" className="flex items-center gap-2 md:hidden text-xl font-bold tracking-tight text-ink no-underline">
            <BrandLogo compact />
            Rallyboard<span className="text-yellow-ink">.</span>
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
          <div className="flex min-w-0 items-center gap-3 text-xs">
            {user ? (
              <>
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1.5 text-xs font-bold text-ink hover:bg-blue-soft md:hidden"
                  onClick={() => { setAccountError(""); setShowAccountMenu(true); }}
                  aria-label={`Open account menu for ${user.name}`}
                >
                  <span className="max-w-[90px] truncate text-right sm:max-w-[160px]">{user.name}</span>
                  <span className="grid size-[32px] shrink-0 place-items-center rounded-full bg-blue text-[11px] font-bold text-white">{initials(user.name)}</span>
                </button>
                <span className="hidden size-[31px] shrink-0 place-items-center rounded-full bg-blue-soft text-[11px] font-bold text-blue md:grid">{initials(user.name)}</span>
                <Link to="/profile" className="hidden font-bold text-ink no-underline hover:text-blue md:inline">{user.name}</Link>
                <button
                  className="ml-2 hidden border-0 bg-transparent text-xs text-muted hover:text-red md:inline"
                  onClick={signOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              <button
                className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white"
                onClick={() => setShowAuth(true)}
              >
                Sign in <span>↗</span>
              </button>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-[1320px] px-[15px] py-[25px] md:px-[25px] md:py-[30px] xl:px-[42px] xl:py-[38px]">
          {events.length > 0 && (
            <label className="mb-[22px] block text-[9px] font-bold tracking-wider text-muted md:hidden [&_select]:mt-2 [&_select]:block [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-line [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-[13px] [&_select]:font-bold [&_select]:text-ink">
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
                <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 border-line bg-white text-blue hover:bg-blue-soft" to="/manage/accounts">
                  Account roles
                </Link>
              )}
              <Link className="inline-flex min-h-10 items-center justify-center gap-4 whitespace-nowrap rounded-lg border border-transparent px-4 py-2.5 text-xs font-bold no-underline transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 bg-blue text-white" to="/manage/new">
                + Create event
              </Link>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet
                context={
                  {
                    user,
                    setUser,
                    authReady,
                    events,
                    refreshEvents,
                    openAuth: () => setShowAuth(true),
                  } satisfies AppContext
                }
              />
            </motion.div>
          </AnimatePresence>
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
      {showAccountMenu && user && (
        <Modal title="Your account" onClose={() => { if (!signingOut) setShowAccountMenu(false); }}>
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-blue-soft p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue text-sm font-bold text-white">{initials(user.name)}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-ink">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
          </div>
          {accountError && <p role="alert" className="mb-4 rounded-lg bg-red-soft p-3 text-sm text-red">{accountError}</p>}
          <div className="grid gap-2">
            <button type="button" data-autofocus className="w-full rounded-lg border border-line px-4 py-3 text-left text-sm font-bold text-ink hover:bg-blue-soft" onClick={() => { setShowAccountMenu(false); navigate("/profile"); }} disabled={signingOut}>My profile <span className="float-right text-muted">›</span></button>
            <button type="button" className="w-full rounded-lg border border-red/20 px-4 py-3 text-left text-sm font-bold text-red hover:bg-red-soft disabled:opacity-50" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
