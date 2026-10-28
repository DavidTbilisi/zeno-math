import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** A menu item; items with a `section` are listed under its heading, in the order given. */
export type ToolItem = { icon: string; label: string; section?: string; onPick: () => void };

/** A toolbar button that opens a dropdown of tools. The list is position:fixed so the bar's overflow can't clip it, and
 *  never taller than the room below the button (it scrolls if it must). A list in sections lays them out side by side
 *  in columns, as many as the window has room for, so a long one such as the games still fits on the screen; the
 *  columns sit in a box of their own, so when they are taller than the room they scroll down rather than spill sideways.
 *  `label` is shown on the button; `title` (the full group name) is the tooltip and the menu's accessible name. */
export function ToolMenu({ icon, label, title = label, items }: { icon: string; label: string; title?: string; items: ToolItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, maxHeight: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current || !list.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = list.current.offsetWidth;
    const top = r.bottom + 4;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top, maxHeight: window.innerHeight - top - 8 });
    list.current.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
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

  // Items in runs of the same section, each run kept together in one column.
  const runs: { section?: string; items: ToolItem[] }[] = [];
  for (const it of items) {
    const last = runs[runs.length - 1];
    if (last && last.section === it.section) last.items.push(it);
    else runs.push({ section: it.section, items: [it] });
  }
  const cols = runs.some((r) => r.section);
  const item = (it: ToolItem) => (
    <button
      key={it.label}
      role="menuitem"
      className="tool-menu-item"
      onClick={() => {
        setOpen(false);
        // The dialog returns focus to whatever had it when it opened: the menu button, not this vanishing item.
        btn.current?.focus();
        it.onPick();
      }}
    >
      <span className="tool-menu-icon">{it.icon}</span>
      {it.label}
    </button>
  );

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
        <div ref={list} className={`tool-menu${cols ? " cols" : ""}`} role="menu" aria-label={title} style={pos} onKeyDown={onListKey}>
          <Sections cols={cols}>
            {runs.map((r, i) =>
              r.section ? (
                <div key={`§${r.section}`} className="tool-menu-section" role="group" aria-label={r.section}>
                  <div className="tool-menu-heading" role="presentation">{r.section}</div>
                  {r.items.map(item)}
                </div>
              ) : (
                <Fragment key={i}>{r.items.map(item)}</Fragment>
              ),
            )}
          </Sections>
        </div>
      )}
    </>
  );
}

/** The columns' own box (no height of its own to fill, so they balance and grow downwards), or nothing for a plain list. */
const Sections = ({ cols, children }: { cols: boolean; children: ReactNode }) => (cols ? <div className="tool-menu-cols">{children}</div> : <>{children}</>);
