import { useState } from "react";
import { api } from "~/lib/api";
import type { Event } from "~/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = { event: Event; onClose: () => void; onDeleted: () => Promise<void> };

export function DeleteEventDialog({ event, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api(`/events/${event.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      title={`Delete ${event.name}?`}
      description="This permanently removes the roster, matches, set scores, and result history for this event."
      confirmLabel="Delete event"
      onClose={onClose}
      onConfirm={confirm}
      busy={busy}
      error={error}
    />
  );
}
