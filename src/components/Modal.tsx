import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "../i18n";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  // Callers pass a new arrow each render; keep the latest without re-attaching the listeners.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    // Focus moves into the dialog (unless a field asked for it), Tab stays inside, and focus returns on close.
    const opener = document.activeElement as HTMLElement | null;
    const el = box.current!;
    if (!el.contains(document.activeElement)) el.querySelector<HTMLElement>(`.modal-body ${FOCUSABLE}`)?.focus() ?? el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-footer">{footer}</footer>
      </div>
    </div>
  );
}

export const INK_COLORS = ["#1e1e1e", "#1971c2", "#e03131", "#2f9e44", "#9c36b5", "#e8590c"];

export function ColorSwatches({ value, onChange, colors = INK_COLORS }: {
  value: string;
  onChange: (c: string) => void;
  colors?: string[];
}) {
  const { t } = useI18n();
  return (
    <div className="swatches" role="radiogroup" aria-label={t.colorLabel}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          className={`swatch${c === value ? " active" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={t.colorNames[c as keyof typeof t.colorNames] ?? c}
          title={t.colorNames[c as keyof typeof t.colorNames] ?? c}
        />
      ))}
    </div>
  );
}
