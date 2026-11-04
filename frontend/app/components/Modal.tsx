import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  destructive?: boolean;
};

export function Modal({ title, onClose, children, destructive = false }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus], input, button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.18, ease: "easeOut" }} ref={dialogRef} role={destructive ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId} className="max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-2xl md:p-7">
        <div className="mb-5 flex items-start justify-between gap-5">
          <h2 id={titleId} className="text-[22px] font-bold leading-tight tracking-tight text-ink">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-md px-1 text-xl leading-none text-muted hover:bg-surface hover:text-ink">×</button>
        </div>
        {children}
      </motion.section>
    </motion.div>,
    document.body,
  );
}
