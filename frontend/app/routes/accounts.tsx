import { useEffect, useState } from "react";
import { api } from "~/lib/api";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { initials, type User } from "~/lib/types";
import { useApp } from "./app-layout";

export default function Accounts() {
  const { user, authReady, openAuth } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<User | null>(null);
  const [roleError, setRoleError] = useState("");
  async function changeRole() {
    if (!selectedAccount) return;
    setBusy(true);
    setRoleError("");
    try {
      await api(`/users/${selectedAccount.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: selectedAccount.role === "coach" ? "player" : "coach" }),
      });
      setUsers(await api("/users"));
      setSelectedAccount(null);
    } catch (cause) {
      setRoleError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user?.role === "admin")
      api<User[]>("/users")
        .then(setUsers)
        .catch((cause) => setError((cause as Error).message));
  }, [user?.role]);
  if (!authReady)
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>Loading account…</h2>
      </div>
    );
  if (user?.role !== "admin")
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl bg-blue-soft p-6 text-center [&_h2]:my-2 [&_h2]:text-[31px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mb-[22px] [&_p]:max-w-[410px] [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted">
        <h2>Admin access required</h2>
        <p>Sign in as an admin to manage account roles.</p>
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
            <span className="h-0.5 w-[21px] bg-blue" /> ADMINISTRATION
          </div>
          <h1>
            Account <em>roles</em>
          </h1>
          <p>Give trusted members coach access.</p>
        </div>
      </div>
      {error && (
        <div className="mb-[18px] flex justify-between gap-5 rounded-lg border border-red/30 bg-red-soft px-[15px] py-[11px] text-[13px] text-red [&_button]:text-xl" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-line bg-white mt-[30px] p-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end [&_h2]:my-1 [&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-[13px] [&_p]:text-muted">
          <div>
            <div className="text-[10px] font-bold tracking-[2px] text-blue">REGISTERED MEMBERS</div>
            <h2>People</h2>
          </div>
        </div>
        <div className="[&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&>div]:border-t [&>div]:border-line [&>div]:py-2.5 [&>div]:text-xs [&_strong]:flex-1">
          {users
            .filter((account) => account.id !== user.id)
            .map((account) => (
              <div key={account.id}>
                <span className="grid size-[31px] shrink-0 place-items-center rounded-full bg-blue-soft text-[11px] font-bold text-blue">{initials(account.name)}</span>
                <strong>{account.name}</strong>
                <span>{account.role}</span>
                <button
                  className="whitespace-nowrap border-0 bg-transparent px-0.5 py-1 text-[11px] font-bold text-blue hover:underline"
                  disabled={busy}
                  onClick={() => { setRoleError(""); setSelectedAccount(account); }}
                >
                  Change role ↗
                </button>
              </div>
            ))}
          {users.length <= 1 && (
            <p className="mb-4 text-xs text-muted">
              Other accounts will appear here after they sign up.
            </p>
          )}
        </div>
      </section>
      {selectedAccount && <ConfirmDialog title={`${selectedAccount.role === "coach" ? "Remove coach access from" : "Give coach access to"} ${selectedAccount.name}?`} description={selectedAccount.role === "coach" ? "This person will no longer be able to create events, manage rosters, or correct results." : "This person will be able to create events, manage rosters, and correct results."} confirmLabel={selectedAccount.role === "coach" ? "Remove coach access" : "Give coach access"} tone={selectedAccount.role === "coach" ? "danger" : "primary"} onClose={() => setSelectedAccount(null)} onConfirm={changeRole} busy={busy} error={roleError} />}
    </>
  );
}
