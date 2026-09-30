import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ToolItem = { icon: string; label: string; onPick: () => void };

/** A toolbar button that opens a dropdown of tools. The list is position:fixed so the bar's overflow can't clip it.
 *  `label` is shown on the button; `title` (the full group name) is the tooltip and the menu's accessible name. */
export function ToolMenu({ icon, label, title = label, items }: { icon: string; label: string; title?: string; items: ToolItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current || !list.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = list.current.offsetWidth;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.bottom + 4 });
    list.current.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const target = e.target as Node;
      if (!list.current?.contains(target) && !btn.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = [...list.current!.querySelectorAll<HTMLButtonElement>("button")];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };

  return (
    <>
      <button
        ref={btn}
        className={`btn primary tool-menu-btn${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon} <span className="btn-label">{label}</span> <span className="caret">▾</span>
      </button>
      {open && (
        <div ref={list} className="tool-menu" role="menu" aria-label={title} style={pos} onKeyDown={onListKey}>
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              className="tool-menu-item"
              onClick={() => {
                setOpen(false);
                it.onPick();
              }}
            >
              <span className="tool-menu-icon">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
