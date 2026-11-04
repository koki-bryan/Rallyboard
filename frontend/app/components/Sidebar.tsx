import { Link, NavLink } from "react-router";
import type { EventItem, User } from "~/lib/types";
import { BrandLogo } from "./BrandLogo";

export function Sidebar({ events, user }: { events: EventItem[]; user: User | null }) {
  return (
    <aside className="hidden md:flex md:h-dvh md:min-h-0 md:overflow-y-auto w-[210px] lg:w-[248px] shrink-0 flex-col border-r border-line bg-blue-soft/60 px-[18px] pb-[22px] pt-[31px]" aria-label="Sidebar">
      <Link to="/" className="flex items-center gap-3 px-[11px] pb-12 text-ink no-underline">
        <BrandLogo />
        <div>
          <strong className="block text-[21px] font-extrabold tracking-tight">
            Rallyboard<span className="text-yellow-ink">.</span>
          </strong>
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
      {user && (
        <NavLink to="/profile" className="mt-4 flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-3.5 py-3 text-left text-[13px] text-muted no-underline hover:bg-white/70">
          My profile <span className="ml-auto text-[19px]">›</span>
        </NavLink>
      )}
    </aside>
  );
}
