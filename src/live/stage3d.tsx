// What the 3D pieces (#567) share with the solid (#564): a world drawn as flat faces in an SVG, nearest last, lit from
// the upper left, fitted to a stage and turned by dragging it. No WebGL, so any number show on one board.
import { add, scale, seen, sub, unit, type V3, type View } from "../math/solid";

/** Light from the upper left, a little in front, as seen. */
export const LIGHT = unit([-0.45, 0.6, 0.66]);
export const PITCH_RANGE: readonly [number, number] = [-80, 85];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const wrap360 = (v: number) => ((Math.round(v) % 360) + 360) % 360;

/** A colour darker by k (0 to 1). */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * k)));
  return `rgb(${c.join(",")})`;
}

/** The middle of some points and how far they reach from it. */
export function fit(points: V3[]): { middle: V3; reach: number } {
  if (!points.length) return { middle: [0, 0, 0], reach: 1 };
  const lo = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]))) as V3;
  const hi = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i]))) as V3;
  const middle = scale(add(lo, hi), 0.5);
  return { middle, reach: Math.max(0.5, ...points.map((p) => Math.hypot(...sub(p, middle)))) };
}

/** A projection onto the stage: the world point `middle` at (cx, cy), px screen units to one unit. */
export function projector(view: View, middle: V3, px: number, cx: number, cy: number) {
  const mid = seen(middle, view);
  return (p: V3): [number, number] => {
    const [x, y] = seen(p, view);
    return [cx + px * (x - mid[0]), cy - px * (y - mid[1])];
  };
}

/** The world's ways that look right and up on the stage, to move a point in the plane facing the viewer. */
export function screenWays(view: View): { right: V3; up: V3 } {
  const e = [seen([1, 0, 0], view), seen([0, 1, 0], view), seen([0, 0, 1], view)];
  return { right: [e[0][0], e[1][0], e[2][0]], up: [e[0][1], e[1][1], e[2][1]] };
}

export type Flat = { pts: [number, number][]; depth: number; fill: string; key: string; stroke: string; width: number; opacity: number };

/** Faces lit and sorted, nearest last, ready to draw. `color` and the rest come from each face. */
export function lay<F extends { pts: V3[]; n: V3 }>(faces: F[], view: View, at: (p: V3) => [number, number], style: (f: F, i: number) => { color: string; stroke?: string; width?: number; opacity?: number }): Flat[] {
  const out = faces.map((f, i) => {
    const n = sub(seen(f.n, view), seen([0, 0, 0], view));
    const k = Math.hypot(...n) || 1;
    const towards = n[2] < 0 ? scale(n, -1 / k) : scale(n, 1 / k);
    const light = 0.74 + 0.34 * Math.max(0, towards[0] * LIGHT[0] + towards[1] * LIGHT[1] + towards[2] * LIGHT[2]);
    const st = style(f, i);
    const depth = f.pts.reduce((s, p) => s + seen(p, view)[2], 0) / Math.max(1, f.pts.length);
    return { pts: f.pts.map(at), depth, fill: shade(st.color, light), key: String(i), stroke: st.stroke ?? "none", width: st.width ?? 0, opacity: st.opacity ?? 1 };
  });
  return out.sort((p, q) => p.depth - q.depth);
}

export const pathOf = (pts: [number, number][]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;

/** A laid face: its fill (with a rim of its own colour to close hairlines between facets) and its outline. */
export function FlatFace({ f, onPointerDown }: { f: Flat; onPointerDown?: (e: React.PointerEvent) => void }) {
  return (
    <path d={pathOf(f.pts)} fill={f.fill} stroke={f.stroke === "none" ? f.fill : f.stroke} strokeWidth={f.stroke === "none" ? 0.8 : f.width}
      strokeLinejoin="round" opacity={f.opacity} onPointerDown={onPointerDown} />
  );
}
