// What the live pieces share: their props, the font of their pictures, pointer positions in SVG units, and the
// small buttons under each piece.
import type { ReactNode, RefObject } from "react";
import type { Dict } from "../locales/en";
import type { LiveKind, LiveStates } from "../math/live";

export type PieceProps<K extends LiveKind> = {
  state: LiveStates[K];
  set: (state: LiveStates[K]) => void;
  w: Dict["live"];
  /** The piece's picture, for "Copy as a picture". */
  svgRef: RefObject<SVGSVGElement | null>;
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

export function Toggle({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button className={`live-btn${on ? " on" : ""}`} aria-pressed={on} title={title} onClick={onClick}>
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
