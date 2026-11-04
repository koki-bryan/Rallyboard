import type { ReactNode } from "react";
import { Modal } from "./Modal";

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  error?: string;
  children?: ReactNode;
  tone?: "danger" | "primary";
};

export function ConfirmDialog({ title, description, confirmLabel, onClose, onConfirm, busy = false, error, children, tone = "danger" }: Props) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose} destructive>
      <p className="mb-5 text-sm leading-relaxed text-muted">{description}</p>
      <form onSubmit={(event) => { event.preventDefault(); if (!busy) void onConfirm(); }}>
        {children}
        {error && <p role="alert" className="mb-4 rounded-lg border border-red/25 bg-red-soft px-3 py-2.5 text-sm text-red">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} disabled={busy} data-autofocus={!children ? true : undefined} className="min-h-10 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-blue hover:bg-blue-soft disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy} className={`min-h-10 rounded-lg px-4 py-2 text-sm font-bold text-white hover:brightness-95 disabled:opacity-50 ${tone === "danger" ? "bg-red" : "bg-blue"}`}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
