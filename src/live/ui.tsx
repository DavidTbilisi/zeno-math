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
