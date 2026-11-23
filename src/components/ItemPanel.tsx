// The item panel: a board item's own controls in a small box beside it, every change drawn on the board at
// once. A tool's dialog renders into it unchanged: Modal sees it is in the panel (PanelContext) and leaves out its
// backdrop, header and footer, and the dialog's useLiveSubmit sends each change in, a moment after it is made.
// A live piece keeps its settings on itself; the panel gives it actions (reset and copy come from the piece, through
// the slot, PanelSlot). No backdrop and no trap: the board stays in use beside it.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { panelPlace } from "../live/hit";

/** True inside the panel: a dialog renders as the panel's body and applies its changes as they are made. */
export const PanelContext = createContext(false);
export const useInPanel = () => useContext(PanelContext);
/** True for a picture not on the board yet: its first value is sent too, which puts it there. */
export const PanelFresh = createContext(false);
/** Sends a change still waiting to go in: the panel calls these before it closes, so nothing made last is lost. */
export type Flushes = Set<() => void>;
const PanelFlush = createContext<Flushes | null>(null);

/** Which live piece's actions go to the panel, and the node they go into. */
export type Slot = { id: string; node: HTMLElement } | null;
export const PanelSlot = createContext<Slot>(null);

/**
 * In the panel, sends the dialog's picture to the board a moment after `value` (its spec) changes. The value it opened
 * with is sent only for a new picture (PanelFresh), which is how one gets onto the board. The value is compared by its
 * JSON, so a spec rebuilt on every render sends nothing new. Outside the panel it does nothing.
 */
export function useLiveSubmit(submit: () => unknown, value: unknown) {
  const inPanel = useContext(PanelContext);
  const fresh = useContext(PanelFresh);
  const flushes = useContext(PanelFlush);
  const latest = useRef(submit);
  latest.current = submit;
  const key = inPanel ? JSON.stringify(value) : "";
  const sent = useRef(fresh ? null : key);
  const waiting = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!inPanel || key === sent.current) return;
    const send = () => {
      window.clearTimeout(t);
      waiting.current = null;
      sent.current = key;
      latest.current();
    };
    const t = window.setTimeout(send, 120);
    waiting.current = send;
    return () => {
      window.clearTimeout(t);
      waiting.current = null;
    };
  }, [inPanel, key]);
  useEffect(() => {
    if (!flushes) return;
    const flush = () => waiting.current?.();
    flushes.add(flush);
    return () => void flushes.delete(flush);
  }, [flushes]);
}

export type ScreenBox = { left: number; top: number; right: number; bottom: number };

export function ItemPanel({ title, anchor, onClose, actions, children, slotRef, fresh = false, flushes = null }: {
  title: string;
  /** The item's rectangle on screen; the panel goes beside it. */
  anchor: ScreenBox;
  onClose: () => void;
  /** Buttons along the bottom (reset, copy, the full editor…). */
  actions?: ReactNode;
  children?: ReactNode;
  /** The node a live piece portals its own actions into, at the start of the row of buttons. */
  slotRef?: (node: HTMLDivElement | null) => void;
  /** The item is a new picture, not yet on the board (see PanelFresh). */
  fresh?: boolean;
  /** Filled with the dialog's pending changes; the owner sends them before it closes the panel. */
  flushes?: Flushes | null;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  // Dragged by its header, it stays where it was put while the item changes under it.
  const moved = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    if (moved.current || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setAt(panelPlace(anchor, { w: r.width, h: r.height }, { w: window.innerWidth, h: window.innerHeight }));
  }, [anchor.left, anchor.top, anchor.right, anchor.bottom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const drag = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("button") || !at) return;
    const start = { x: e.clientX, y: e.clientY, ...at };
    const move = (m: PointerEvent) => {
      moved.current = true;
      setAt({ left: start.left + m.clientX - start.x, top: Math.max(0, start.top + m.clientY - start.y) });
    };
    const up = () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", up));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={box}
      className="item-panel"
      role="dialog"
      aria-label={title}
      style={at ? { left: at.left, top: at.top } : { left: -9999, top: 0 }}
      // Keeps the board's own menu and shortcuts out of the panel.
      onContextMenu={(e) => e.stopPropagation()}
    >
      <header className="item-panel-head" onPointerDown={drag}>
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t.close} title={t.close}>×</button>
      </header>
      <div className="item-panel-body">
        <PanelContext.Provider value={true}>
          <PanelFresh.Provider value={fresh}>
            <PanelFlush.Provider value={flushes}>{children}</PanelFlush.Provider>
          </PanelFresh.Provider>
        </PanelContext.Provider>
      </div>
      {(actions || slotRef) && (
        <footer className="item-panel-actions">
          {slotRef && <div ref={slotRef} className="item-panel-slot" />}
          {actions}
        </footer>
      )}
    </div>
  );
}
