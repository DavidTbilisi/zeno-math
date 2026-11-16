// What the live pieces share: their props, the font of their pictures, pointer positions in SVG units, and the
// small buttons under each piece.
import { createContext, useContext, type HTMLAttributes, type ReactNode, type RefObject, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { Dict } from "../locales/en";
import type { LiveKind, LiveStates } from "../math/live";

export type PieceProps<K extends LiveKind> = {
  state: LiveStates[K];
  set: (state: LiveStates[K]) => void;
  w: Dict["live"];
  /** The piece's picture, for "Copy as a picture". */
  svgRef: RefObject<SVGSVGElement | null>;
  /** Puts another piece beside this one, its starting state changed by the patch (on the board only). */
  open?: (kind: LiveKind, patch?: object) => void;
};

export const FONT = "Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif";
export const INK = "#1e1e1e";
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** A point of the pointer in the SVG's own units, whatever the board's zoom and the piece's scale. */
export function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): [number, number] {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}

export function Toggle({ on, onClick, children, title, disabled }: { on: boolean; onClick: () => void; children: ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button className={`live-btn${on ? " on" : ""}`} aria-pressed={on} title={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/** A number with − and + buttons either side. */
export function Stepper({ value, min, max, onChange, less, more }: { value: number; min: number; max: number; onChange: (v: number) => void; less: string; more: string }) {
  return (
    <span className="live-stepper">
      <button className="live-btn" disabled={value <= min} title={less} aria-label={less} onClick={() => onChange(value - 1)}>−</button>
      <b>{value}</b>
      <button className="live-btn" disabled={value >= max} title={more} aria-label={more} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

/** A fraction top over bottom, in SVG. */
export function SvgFrac({ n, d, x, y, size = 16 }: { n: number; d: number; x: number; y: number; size?: number }) {
  const w = Math.max(String(n).length, String(d).length) * size * 0.6 + 4;
  return (
    <g fontSize={size} textAnchor="middle" fill={INK}>
      <text x={x} y={y - size * 0.15}>{n}</text>
      <line x1={x - w / 2} y1={y + size * 0.05} x2={x + w / 2} y2={y + size * 0.05} stroke={INK} strokeWidth={1.5} />
      <text x={x} y={y + size * 0.95}>{d}</text>
    </g>
  );
}
/** A fraction top over bottom, in a button. */
export const HtmlFrac = ({ n, d }: { n: number; d: number }) => (
  <span className="frac">
    <b>{n}</b>
    <i>{d}</i>
  </span>
);

// ——— The right-click panel ———

/** Where this piece's settings go while the right-click panel is open on it (null when it isn't). */
export const PieceSlot = createContext<HTMLElement | null>(null);

const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * Puts a copy of `children` in the right-click panel while it is open on this piece, and nothing anywhere else. The
 * copy works the piece's own state, so a change made in either place shows in both. Its events stop at the copy: in
 * React they would bubble on through the piece to the board's embeddable, which would take a click for its own.
 */
export function ToPanel({ children }: { children: ReactNode }) {
  const node = useContext(PieceSlot);
  return node
    ? createPortal(
        <div className="piece-panel-part" onPointerDown={stop} onMouseDown={stop} onClick={stop} onKeyDown={stop} onWheel={stop} onContextMenu={stop}>
          {children}
        </div>,
        node,
      )
    : null;
}

/** A bar of the piece's settings (what it shows and how, not the play itself): in the piece, and in the panel too. */
export function SettingsBar({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const cls = className ? `live-bar ${className}` : "live-bar";
  return (
    <>
      <div className={cls} {...rest}>{children}</div>
      <ToPanel>
        <div className={cls} {...rest}>{children}</div>
      </ToPanel>
    </>
  );
}
