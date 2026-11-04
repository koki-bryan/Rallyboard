import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "~/lib/api";
import type { User } from "~/lib/types";
import { useApp } from "./app-layout";

const inputClass = "mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

export default function Profile() {
  const { user, authReady, openAuth, setUser, refreshEvents } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setEmail(user?.email ?? ""), [user?.email]);

  async function saveEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await api<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ email, password: emailPassword }),
      });
      setUser(updated);
      setEmailPassword("");
      setMessage("Email updated.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Delete your account? Your email and sign-in access will be removed. Past match results will stay under an anonymous former-player name.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      setUser(null);
      await refreshEvents();
      navigate("/");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return <div className="rounded-xl bg-blue-soft p-8 text-center text-muted">Loading profile…</div>;
  if (!user) return <div className="mx-auto max-w-[560px] rounded-xl border border-line bg-white p-8 text-center"><h1 className="text-2xl font-bold">Sign in to view your profile</h1><button className="mt-5 rounded-lg bg-blue px-5 py-2.5 text-sm font-bold text-white" onClick={openAuth}>Sign in ↗</button></div>;

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-7"><div className="mb-2 text-[10px] font-extrabold tracking-[2px] text-blue">YOUR ACCOUNT</div><h1 className="text-[34px] font-bold tracking-tight text-ink">My profile</h1><p className="mt-2 text-sm text-muted">Manage the email you use to sign in.</p></div>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">{error}</div>}
      {message && <div role="status" className="mb-5 rounded-lg border border-green/30 bg-green-soft px-4 py-3 text-sm text-green">{message}</div>}
      <section className="rounded-xl border border-line bg-white p-6 md:p-7"><div className="mb-5 border-b border-line pb-5"><h2 className="text-xl font-bold">Account details</h2><p className="mt-1 text-sm text-muted">{user.name} · {user.role}</p></div>
        <form onSubmit={saveEmail} className="grid gap-4"><label className="text-xs font-bold text-muted">Email address<input className={inputClass} type="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} /></label><label className="text-xs font-bold text-muted">Current password<input className={inputClass} type="password" required value={emailPassword} onChange={event => setEmailPassword(event.target.value)} /></label><button className="justify-self-start rounded-lg bg-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={busy || email.trim().toLowerCase() === user.email}>Save email ↗</button></form>
      </section>
      <section className="mt-6 rounded-xl border border-red/25 bg-red-soft/30 p-6 md:p-7"><h2 className="text-xl font-bold text-red">Delete account</h2><p className="mt-2 text-sm leading-relaxed text-muted">This removes your email and sign-in access. Your past results stay in the event under an anonymous former-player name.</p><form onSubmit={removeAccount} className="mt-5 grid gap-4"><label className="text-xs font-bold text-muted">Current password<input className={inputClass} type="password" required value={deletePassword} onChange={event => setDeletePassword(event.target.value)} /></label><button className="justify-self-start rounded-lg bg-red px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={busy}>Delete my account</button></form></section>
    </div>
  );
}
