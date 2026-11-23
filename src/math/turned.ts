// A solid of revolution worked by hand (#567): the flat region between y = f(x) and y = g(x) on a ≤ x ≤ b, turned
// about an axis as far as it is dragged, and cut into n discs, washers or shells whose sum closes in on the volume.
// One slab can be pulled out to read π r² Δx with its numbers. The numbers come from revolution.ts (the same as the
// 3D tool had); this file makes the faces the piece draws, in the solid's world: z up, the viewer in front (−y).
import { MAX_SLICES, revolve, type Column, type RevAxis, type Revolution, type RevWords } from "./revolution";
import { add, cross, scale, sub, unit, type V3 } from "./solid";

/** A number to two places at most: 0.5, 3.06, −1. */
const fmt = (v: number) => String(Math.round(v * 100) / 100).replace("-", "−");

/** Regions worth turning: the 3D tool's examples (a cone, a sphere, a washer, shells, a torus and Gabriel's horn). */
export const TURNED_PRESETS = [
  { key: "paraboloid", f: "x^2", g: "", a: 0, b: 2, axis: "x" },
  { key: "root", f: "sqrt(x)", g: "", a: 0, b: 4, axis: "x" },
  { key: "cone", f: "x/2", g: "", a: 0, b: 4, axis: "x" },
  { key: "sphere", f: "sqrt(9 - x^2)", g: "", a: -3, b: 3, axis: "x" },
  { key: "washer", f: "x", g: "x^2", a: 0, b: 1, axis: "x" },
  { key: "torus", f: "3 + sqrt(1 - x^2)", g: "3 - sqrt(1 - x^2)", a: -1, b: 1, axis: "x" },
  { key: "horn", f: "1/x", g: "", a: 1, b: 8, axis: "x" },
  { key: "shell", f: "x^2", g: "", a: 0, b: 2, axis: "y" },
  { key: "shell2", f: "2x - x^2", g: "", a: 0, b: 2, axis: "y" },
] as const satisfies readonly { key: string; f: string; g: string; a: number; b: number; axis: RevAxis }[];
export type TurnedPreset = (typeof TURNED_PRESETS)[number]["key"];

export type LiveTurned = {
  preset: TurnedPreset;
  /** The limits, in halves. */
  a: number;
  b: number;
  /** How far round it is turned, whole degrees, 0 (the flat region) to 360. */
  sweep: number;
  /** 0 = the smooth solid, else n slabs. */
  slices: number;
  /** The slab pulled out to be read, or null. */
  pulled: number | null;
  yaw: number;
  pitch: number;
};

export const TURNED_START: LiveTurned = { preset: "paraboloid", a: 0, b: 2, sweep: 270, slices: 0, pulled: null, yaw: 35, pitch: 24 };
export const SLICES: readonly [number, number] = [0, MAX_SLICES];
/** The limits move in halves, no further out than this. */
export const LIMIT = 12;

export const presetOf = (key: TurnedPreset) => TURNED_PRESETS.find((p) => p.key === key) ?? TURNED_PRESETS[0];

/** The region of the piece as revolution.ts reads it, or the reason it cannot be turned. */
export function turnedRevolution(s: LiveTurned, w: RevWords): { ok: Revolution } | { error: string } {
  const p = presetOf(s.preset);
  try {
    return { ok: revolve({ f: p.f, g: p.g, a: String(s.a), b: String(s.b), axis: p.axis, slices: s.slices }, w) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Another region from the tray, at its own limits, smooth, as far round as it was. */
export function pickPreset(s: LiveTurned, key: TurnedPreset): LiveTurned {
  const p = presetOf(key);
  return { ...s, preset: key, a: p.a, b: p.b, slices: 0, pulled: null };
}

/** A limit moved: kept only where the region can still be turned (else the piece stays as it was). */
export function moveLimit(s: LiveTurned, which: "a" | "b", v: number, w: RevWords): LiveTurned {
  const to = Math.max(-LIMIT, Math.min(LIMIT, Math.round(v * 2) / 2));
  const next = { ...s, [which]: to, pulled: null };
  if (next.b - next.a < 0.5) return s;
  return "ok" in turnedRevolution(next, w) ? next : s;
}

/** A change in the number of slabs; a pulled slab stays pulled only if it is still there. */
export function setSlices(s: LiveTurned, n: number): LiveTurned {
  const slices = Math.max(SLICES[0], Math.min(SLICES[1], Math.round(n)));
  return { ...s, slices, pulled: s.pulled !== null && s.pulled < slices ? s.pulled : null };
}

// ---- the faces -----------------------------------------------------------------------------------------------------

export type TurnedTag = "region" | "outer" | "inner" | "end" | "slab" | "pulled";
export type TurnedFace = { pts: V3[]; n: V3; tag: TurnedTag; group: number };

/** A point (x, y) of the region turned θ about the axis. It goes round away from the viewer first, so the gap left
 * by a part turn is at the front, where the flat region shows. */
export function place(axis: RevAxis, x: number, y: number, theta: number): V3 {
  return axis === "x" ? [x, y * Math.sin(theta), y * Math.cos(theta)] : [x * Math.cos(theta), x * Math.sin(theta), y];
}

const normalOf = (pts: V3[]): V3 => unit(pts.reduce((s, p, i) => add(s, cross(p, pts[(i + 1) % pts.length])), [0, 0, 0] as V3));
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Steps round for a sweep: about one every `per` degrees. */
const stepsFor = (sweep: number, per: number) => Math.max(1, Math.ceil(sweep / per));

/** The region's outline, once round: along the top from a to b, down the right end, back along the bottom, up the left. */
function outline(cols: Column[]): [number, number][] {
  return [...cols.map((c): [number, number] => [c.x, c.hi]), ...[...cols].reverse().map((c): [number, number] => [c.x, c.lo])];
}

/** Every edge of an outline swept round by `sweep` degrees, as quads; the flat region at both ends when not a full turn. */
function sweepOutline(axis: RevAxis, loop: [number, number][], sweep: number, per: number, tag: (i: number) => TurnedTag, group: number, flat: TurnedTag | null): TurnedFace[] {
  const k = stepsFor(sweep, per);
  const th = Array.from({ length: k + 1 }, (_, j) => rad((sweep * j) / k));
  const out: TurnedFace[] = [];
  for (let i = 0; i < loop.length; i++) {
    const [p, q] = [loop[i], loop[(i + 1) % loop.length]];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9) continue;
    // An edge lying on the axis sweeps nothing.
    if (axis === "x" ? Math.abs(p[1]) < 1e-9 && Math.abs(q[1]) < 1e-9 : Math.abs(p[0]) < 1e-9 && Math.abs(q[0]) < 1e-9) continue;
    for (let j = 0; j < k; j++) {
      const pts = [place(axis, p[0], p[1], th[j]), place(axis, q[0], q[1], th[j]), place(axis, q[0], q[1], th[j + 1]), place(axis, p[0], p[1], th[j + 1])];
      out.push({ pts, n: normalOf(pts), tag: tag(i), group });
    }
  }
  if (flat && sweep < 360) {
    for (const t of sweep > 0 ? [0, rad(sweep)] : [0]) {
      const pts = loop.map(([x, y]) => place(axis, x, y, t));
      out.push({ pts, n: normalOf(pts), tag: flat, group: -1 });
    }
  }
  return out;
}

/** Columns enough to draw a smooth surface (the region is sampled more finely than a picture needs). */
const DRAW = 36;

/** The smooth solid (or just the flat region at sweep 0) as faces. */
export function smoothFaces(r: Revolution, axis: RevAxis, sweep: number): TurnedFace[] {
  const every = Math.max(1, Math.floor((r.columns.length - 1) / DRAW));
  const cols = r.columns.filter((_, i) => i % every === 0 || i === r.columns.length - 1);
  const loop = outline(cols);
  const top = cols.length;
  // Along the top is the outer surface; back along the bottom the inner; the two ends between.
  const tag = (i: number): TurnedTag => (i < top - 1 ? "outer" : i === top - 1 || i === loop.length - 1 ? "end" : "inner");
  return sweepOutline(axis, loop, sweep, 15, tag, 0, "region");
}

/** The n slabs (discs, washers or shells), the pulled one moved out of the solid and coloured. */
export function slabFaces(r: Revolution, axis: RevAxis, sweep: number, pulled: number | null): TurnedFace[] {
  const out: TurnedFace[] = [];
  const away = pullOffset(r, axis);
  r.slabs.forEach(([c0, c1], i) => {
    const loop: [number, number][] = [[c0.x, c0.hi], [c1.x, c1.hi], [c1.x, c1.lo], [c0.x, c0.lo]];
    const mine = i === pulled;
    const faces = sweepOutline(axis, loop, mine ? 360 : sweep, 20, () => (mine ? "pulled" : "slab"), i + 1, mine ? null : "region");
    out.push(...(mine ? faces.map((f) => ({ ...f, pts: f.pts.map((p) => add(p, away)) })) : faces));
  });
  return out;
}

/** Where a pulled slab goes: below the solid, clear of it. */
export function pullOffset(r: Revolution, axis: RevAxis): V3 {
  return axis === "x" ? [0, 0, -(1.4 * r.reach + 0.6)] : [0, 0, -(r.along[1] - r.along[0] + 0.8)];
}

/** What a slab holds, worked: π r² Δx (or the washer's, or the shell's) with its numbers in. */
export function slabSum(r: Revolution, axis: RevAxis, i: number): string {
  const [c0, c1] = r.slabs[i];
  const dx = fmt(c1.x - c0.x);
  if (axis === "y") {
    const x = Math.abs((c0.x + c1.x) / 2);
    const h = c0.hi - c0.lo;
    return `2π × ${fmt(x)} × ${fmt(h)} × ${dx} ≈ ${fmt(2 * Math.PI * x * h * (c1.x - c0.x))}`;
  }
  const [p, q] = [Math.abs(c0.lo), Math.abs(c0.hi)];
  const R = Math.max(p, q);
  const rr = c0.lo <= 0 && c0.hi >= 0 ? 0 : Math.min(p, q);
  const v = Math.PI * (R * R - rr * rr) * (c1.x - c0.x);
  return rr === 0
    ? `π × ${fmt(R)}² × ${dx} ≈ ${fmt(v)}`
    : `π × (${fmt(R)}² − ${fmt(rr)}²) × ${dx} ≈ ${fmt(v)}`;
}

/** The point on the rim the sweep handle sits at: the far end of the region, turned as far as the solid is. */
export function rimPoint(r: Revolution, axis: RevAxis, sweep: number): { at: V3; way: V3 } {
  // The column furthest from the axis, at its outer edge.
  let best = r.columns[0];
  let far = -1;
  for (const c of r.columns) {
    const d = axis === "x" ? Math.max(Math.abs(c.hi), Math.abs(c.lo)) : Math.abs(c.x);
    if (d > far) [far, best] = [d, c];
  }
  const y = Math.abs(best.hi) >= Math.abs(best.lo) ? best.hi : best.lo;
  const t = rad(sweep);
  const at = place(axis, best.x, y, t);
  // Which way the point moves as the sweep grows by a degree.
  const way = scale(sub(place(axis, best.x, y, t + rad(1)), at), 1);
  return { at, way };
}
