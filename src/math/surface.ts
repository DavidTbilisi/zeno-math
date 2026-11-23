// A surface z = f(x, y) worked by hand on the board (#565): the hill drawn as a shaded mesh over a square, its
// contour map on the floor under it, and a point on both. Through the point: the slice of the hill by the plane
// x = x₀ or y = y₀ and its tangent (a partial derivative is that slope), the gradient (uphill, across the contour, as
// long as the hill is steep), a fence g(x, y) = c the point walks along (the highest and lowest points on it are where
// a contour of f touches the fence: Lagrange), and a ball rolling downhill by gradient descent. Everything here is
// plain maths, drawn by the piece on the 3D stage of the solid piece (solid.ts: no WebGL), so any number show on a board.
import { BETAS, ETAS, etaIndex } from "./descentLab";
import { evalE, parseE, tidy } from "./expr";
import { seen, type V3 } from "./solid";

export type P2 = [number, number];
export type SurfaceFn = "bowl" | "saddle" | "hill" | "ravine";
export const SURFACE_FNS: readonly SurfaceFn[] = ["bowl", "saddle", "hill", "ravine"];
/** What the hand does with the point: move it, slice through it, take the gradient there, walk a fence, roll a ball. */
export type SurfaceMode = "point" | "slice" | "gradient" | "lagrange" | "descent";
export const SURFACE_MODES: readonly SurfaceMode[] = ["point", "slice", "gradient", "lagrange", "descent"];
/** The slice: along x (the plane y = y₀, its slope ∂f/∂x) or along y (the plane x = x₀, its slope ∂f/∂y). */
export type SliceAxis = "x" | "y";
export const SLICE_AXES: readonly SliceAxis[] = ["x", "y"];

export type LiveSurface = {
  /** The preset picked from the tray, or "own" for a function that came in some other way. */
  fn: SurfaceFn | "own";
  /** f(x, y), as the Multivariable tool reads it. */
  expr: string;
  /** The square drawn: −half ≤ x, y ≤ half. */
  half: number;
  /** The fence for Lagrange: g(x, y) = c. */
  g: string;
  c: number;
  /** How it is turned, whole degrees: round the upright, and up from level. */
  yaw: number;
  pitch: number;
  mode: SurfaceMode;
  /** The point on the floor. */
  x: number;
  y: number;
  axis: SliceAxis;
  /** Where the point is on the fence: a share of the way along it, 0 to 1. */
  t: number;
  /** Gradient descent: the learning rate, the momentum and the steps taken from the point. */
  eta: number;
  beta: number;
  steps: number;
};

type Preset = Pick<LiveSurface, "expr" | "half" | "g" | "c" | "x" | "y" | "eta">;
/** The tray's functions, each with a square that shows it well, a fence with a top or bottom on it, and a start. */
export const SURFACE_PRESETS: Record<SurfaceFn, Preset> = {
  bowl: { expr: "x^2 + y^2", half: 2, g: "x + y", c: 2, x: 1.5, y: -1, eta: 0.1 },
  saddle: { expr: "x^2 - y^2", half: 2, g: "x^2 + y^2", c: 1, x: 1, y: 0.5, eta: 0.1 },
  hill: { expr: "4e^(-(x^2 + 2y^2)/4)", half: 3, g: "x + y", c: 2, x: 1.5, y: -1.5, eta: 0.5 },
  ravine: { expr: "x^2/5 + 3y^2", half: 3, g: "x^2 + y^2", c: 4, x: -2.5, y: 1.2, eta: 0.3 },
};

export const PITCH: readonly [number, number] = [10, 85];
export const SURFACE_START: LiveSurface = {
  fn: "bowl", ...SURFACE_PRESETS.bowl, yaw: 330, pitch: 24, mode: "point", axis: "x", t: 0.25, beta: 0, steps: 0,
};

/** Another function from the tray: its square, its fence and its start, keeping the view and what the hand does. */
export function pickFn(s: LiveSurface, fn: SurfaceFn): LiveSurface {
  return { ...s, fn, ...SURFACE_PRESETS[fn], t: 0.25, beta: 0, steps: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** A number as written under the picture: two decimals at most, a real minus sign. */
export const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return (Object.is(r, -0) ? "0" : String(r)).replace("-", "−");
};
/** The point moved, kept on the square and to two decimals; a new start for the ball. */
export const movePoint = (s: LiveSurface, x: number, y: number): LiveSurface => ({
  ...s, x: Math.round(clamp(x, -s.half, s.half) * 100) / 100, y: Math.round(clamp(y, -s.half, s.half) * 100) / 100, steps: 0,
});

// ---- the function ---------------------------------------------------------------------------------------------------

export type F2 = (x: number, y: number) => number;

/** f(x, y) from its text, or null when it cannot be read or is undefined over most of the square. */
export function readSurface(expr: string, half: number): F2 | null {
  try {
    const e = tidy(parseE(expr, ["y"]));
    const f: F2 = (x, y) => evalE(e, x, { y });
    let ok = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) if (Number.isFinite(f(-half + (half * i) / 5, -half + (half * j) / 5))) ok++;
    return ok > 0.7 * 121 ? f : null;
  } catch {
    return null;
  }
}

/** The partial derivatives at (x, y), by central differences. */
export function gradient(f: F2, x: number, y: number): P2 {
  const hx = 1e-5 * Math.max(1, Math.abs(x));
  const hy = 1e-5 * Math.max(1, Math.abs(y));
  return [(f(x + hx, y) - f(x - hx, y)) / (2 * hx), (f(x, y + hy) - f(x, y - hy)) / (2 * hy)];
}

// ---- the mesh and its map ---------------------------------------------------------------------------------------------

/** f on an (n + 1) × (n + 1) grid over the square: z[i][j] at x = −half + 2half·i/n, y = −half + 2half·j/n. */
export type Grid = { n: number; half: number; z: number[][] };
export function grid(f: F2, half: number, n: number): Grid {
  const at = (k: number) => -half + (2 * half * k) / n;
  return { n, half, z: Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => f(at(i), at(j)))) };
}
export const gridAt = (g: Grid, k: number) => -g.half + (2 * g.half * k) / g.n;

/** The heights the picture spans: the lowest and highest on the grid, unless a few spikes would flatten the rest. */
export function zRange(g: Grid): [number, number] {
  const vs = g.z.flat().filter(Number.isFinite).sort((a, b) => a - b);
  if (!vs.length) return [0, 1];
  const q = (p: number) => vs[Math.round(p * (vs.length - 1))];
  let [lo, hi] = [vs[0], vs[vs.length - 1]];
  const [q2, q98] = [q(0.02), q(0.98)];
  if (hi - q98 > q98 - q2) hi = q98;
  if (q2 - lo > q98 - q2) lo = q2;
  if (hi - lo < 1e-9) [lo, hi] = [lo - 0.5, hi + 0.5];
  return [lo, hi];
}

/** A round step for about `k` contour levels across [lo, hi]: 1, 2 or 5 times a power of ten. */
export function levelStep(lo: number, hi: number, k = 10): number {
  const raw = (hi - lo) / k;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw * 0.999) ?? 10 * p;
}
/** The contour levels: every round step strictly between lo and hi. */
export function levels(lo: number, hi: number, k = 10): number[] {
  const step = levelStep(lo, hi, k);
  const out: number[] = [];
  for (let v = Math.floor(lo / step + 1) * step; v < hi - step * 1e-6; v += step) if (v > lo + step * 1e-6) out.push(Math.round(v / step) * step);
  return out;
}

export type Seg = [P2, P2];
/**
 * The contour f = level across the grid, as short segments (marching squares). Where an edge is crossed is worked out
 * the same way from both cells beside it, so the segments meet exactly and joinSegments can chain them.
 */
export function contour(g: Grid, level: number): Seg[] {
  const out: Seg[] = [];
  // A corner exactly on the level counts as a hair above it, so no crossing falls on a corner (shared by four cells).
  const eps = 1e-12 * (1 + Math.abs(level));
  const v = (i: number, j: number) => {
    const d = g.z[i][j] - level;
    return Math.abs(d) < eps ? eps : d;
  };
  // The crossing on the edge from (i0, j0) to (i1, j1), with the lower corner first.
  const cross = (i0: number, j0: number, i1: number, j1: number): P2 => {
    const [a, b] = [v(i0, j0), v(i1, j1)];
    const t = a / (a - b);
    return [gridAt(g, i0 + (i1 - i0) * t), gridAt(g, j0 + (j1 - j0) * t)];
  };
  for (let i = 0; i < g.n; i++)
    for (let j = 0; j < g.n; j++) {
      const c = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
      if (!c.every(Number.isFinite)) continue;
      const up = c.map((x) => x > 0);
      // The edges: bottom (i,j)–(i+1,j), right (i+1,j)–(i+1,j+1), top (i,j+1)–(i+1,j+1), left (i,j)–(i,j+1).
      const edges: (P2 | null)[] = [
        up[0] !== up[1] ? cross(i, j, i + 1, j) : null,
        up[1] !== up[2] ? cross(i + 1, j, i + 1, j + 1) : null,
        up[3] !== up[2] ? cross(i, j + 1, i + 1, j + 1) : null,
        up[0] !== up[3] ? cross(i, j, i, j + 1) : null,
      ];
      const hit = edges.flatMap((p, k) => (p ? [k] : []));
      if (hit.length === 2) out.push([edges[hit[0]]!, edges[hit[1]]!]);
      else if (hit.length === 4) {
        // A saddle cell: the middle decides which pair of opposite corners is joined.
        const mid = (c[0] + c[1] + c[2] + c[3]) / 4 > 0;
        const [b, r, t, l] = edges as P2[];
        if (mid === up[0]) out.push([b, r], [t, l]);
        else out.push([b, l], [r, t]);
      }
    }
  return out;
}

const pkey = (p: P2) => `${p[0]},${p[1]}`;
/** Segments chained into lines where they meet end to end; a closed loop ends where it began. */
export function joinSegments(segs: Seg[]): P2[][] {
  const at = new Map<string, number[]>();
  segs.forEach((s, i) => s.forEach((p) => at.set(pkey(p), [...(at.get(pkey(p)) ?? []), i])));
  const used = segs.map(() => false);
  const extend = (line: P2[]) => {
    for (;;) {
      const end = line[line.length - 1];
      const next = (at.get(pkey(end)) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = true;
      const [p, q] = segs[next];
      line.push(pkey(p) === pkey(end) ? q : p);
    }
  };
  const lines: P2[][] = [];
  segs.forEach((s, i) => {
    if (used[i]) return;
    used[i] = true;
    const line: P2[] = [s[0], s[1]];
    extend(line);
    line.reverse();
    extend(line);
    lines.push(line);
  });
  return lines;
}

// ---- a path the point walks along: the fence g = c ---------------------------------------------------------------

/** A line of points with the length walked to each, and whether it closes on itself. */
export type Path = { pts: P2[]; cum: number[]; closed: boolean };
export function pathOf(pts: P2[]): Path {
  const closed = pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, closed };
}
export const pathLength = (p: Path) => p.cum[p.cum.length - 1];

/** The fence g(x, y) = c across the square: its longest piece, or null when it does not cross the square. */
export function fence(g: F2, c: number, half: number, n = 120): Path | null {
  const lines = joinSegments(contour(grid((x, y) => g(x, y) - c, half, n), 0)).map(pathOf);
  const best = lines.sort((p, q) => pathLength(q) - pathLength(p))[0];
  return best && pathLength(best) > 0 ? best : null;
}

/** The point a share t of the way along the path. */
export function along(p: Path, t: number): P2 {
  const L = pathLength(p);
  const s = (p.closed ? ((t % 1) + 1) % 1 : clamp(t, 0, 1)) * L;
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < s) i++;
  const span = p.cum[i] - p.cum[i - 1] || 1;
  const k = (s - p.cum[i - 1]) / span;
  const [a, b] = [p.pts[i - 1], p.pts[i]];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
/** The way along the path at t, one unit long. */
export function tangentAt(p: Path, t: number): P2 {
  const d = 1e-4;
  const [a, b] = [along(p, p.closed ? t - d : Math.max(0, t - d)), along(p, p.closed ? t + d : Math.min(1, t + d))];
  const r = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / r, (b[1] - a[1]) / r];
}
/** The share of the way along the path to its point nearest q. */
export function nearestT(p: Path, q: P2): number {
  let best = { d: Infinity, s: 0 };
  for (let i = 1; i < p.pts.length; i++) {
    const [a, b] = [p.pts[i - 1], p.pts[i]];
    const [ux, uy] = [b[0] - a[0], b[1] - a[1]];
    const uu = ux * ux + uy * uy || 1;
    const k = clamp(((q[0] - a[0]) * ux + (q[1] - a[1]) * uy) / uu, 0, 1);
    const d = Math.hypot(a[0] + ux * k - q[0], a[1] + uy * k - q[1]);
    if (d < best.d) best = { d, s: p.cum[i - 1] + k * (p.cum[i] - p.cum[i - 1]) };
  }
  return best.s / (pathLength(p) || 1);
}

export type Extremum = { t: number; x: number; y: number; v: number; kind: "max" | "min" };
/**
 * The highest and lowest points of f along the path (not its ends): where f stops rising and starts falling, found on
 * the path's own points and made exact by a golden-section search between their neighbours.
 */
export function pathExtrema(p: Path, f: F2): Extremum[] {
  const L = pathLength(p);
  const n = p.pts.length - (p.closed ? 1 : 0);
  const ts = p.cum.slice(0, n).map((s) => s / L);
  const vs = ts.map((t) => f(...along(p, t)));
  const out: Extremum[] = [];
  for (let i = 0; i < n; i++) {
    if (!p.closed && (i === 0 || i === n - 1)) continue;
    const [a, b] = [(i - 1 + n) % n, (i + 1) % n];
    const isMax = vs[i] > vs[a] && vs[i] >= vs[b];
    const isMin = vs[i] < vs[a] && vs[i] <= vs[b];
    if (!isMax && !isMin) continue;
    // Between the neighbours (across the seam of a loop, t runs on past 1).
    let [lo, hi] = [ts[a], ts[b]];
    if (lo > ts[i]) lo -= 1;
    if (hi < ts[i]) hi += 1;
    const g = (t: number) => (isMax ? -1 : 1) * f(...along(p, t));
    const r = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 60; k++) {
      const [m1, m2] = [hi - r * (hi - lo), lo + r * (hi - lo)];
      if (g(m1) < g(m2)) hi = m2;
      else lo = m1;
    }
    const t = (((lo + hi) / 2) % 1 + 1) % 1;
    const [x, y] = along(p, t);
    if (out.some((e) => Math.hypot(e.x - x, e.y - y) < 1e-6)) continue;
    out.push({ t, x, y, v: f(x, y), kind: isMax ? "max" : "min" });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** The gap between two shares of the way along a path (round a loop, the shorter way). */
export const tGap = (p: Path, a: number, b: number) => {
  const d = Math.abs(a - b);
  return p.closed ? Math.min(d, 1 - d) : d;
};
/** A point let go within `snap` of a top or bottom on the fence lands on it. */
export function snapT(p: Path, ext: Extremum[], t: number, snap = 0.015): number {
  const near = ext.find((e) => tGap(p, e.t, t) < snap);
  return near ? near.t : p.closed ? ((t % 1) + 1) % 1 : clamp(t, 0, 1);
}
/** λ with ∇f = λ∇g at a point (the best fit, which is exact where the contours touch). */
export function lambdaAt(gf: P2, gg: P2): number {
  return (gf[0] * gg[0] + gf[1] * gg[1]) / (gg[0] * gg[0] + gg[1] * gg[1] || 1);
}

// ---- gradient descent on the hill -----------------------------------------------------------------------------------

export { BETAS, ETAS, etaIndex };
/** The ball's way down from (x, y): each step v ← βv − η∇f, then (x, y) ← (x, y) + v; it stops if it leaves the square. */
export function descend(f: F2, start: P2, eta: number, beta: number, n: number, half: number): { pts: P2[]; away: boolean } {
  const pts: P2[] = [start];
  let [x, y] = start;
  let [vx, vy] = [0, 0];
  for (let k = 0; k < n; k++) {
    const [gx, gy] = gradient(f, x, y);
    [vx, vy] = [beta * vx - eta * gx, beta * vy - eta * gy];
    [x, y] = [x + vx, y + vy];
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > half * 1.001 || Math.abs(y) > half * 1.001) return { pts, away: true };
    pts.push([x, y]);
  }
  return { pts, away: false };
}

/** How long the gradient arrow is drawn per unit of steepness: a typical slope on the square is a fifth of it. */
export function arrowScale(f: F2, half: number): number {
  const g = grid(f, half, 12);
  const ms: number[] = [];
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
    const [a, b] = gradient(f, gridAt(g, i), gridAt(g, j));
    const m = Math.hypot(a, b);
    if (Number.isFinite(m)) ms.push(m);
  }
  ms.sort((a, b) => a - b);
  const typical = ms[Math.floor(ms.length / 2)] || 1;
  return (0.4 * half) / typical;
}

// ---- the stage --------------------------------------------------------------------------------------------------------

/** The square is drawn 4 units across, the floor under it at FLOOR and the hill between Z0 and Z0 + ZS. */
export const SIDE = 2;
export const FLOOR = -2.6;
export const Z0 = -1;
export const ZS = 2.4;
/** Where a point of the function is on the stage: (x, y) on the square, z (clamped to the heights shown) up. */
export const toStage = (half: number, [lo, hi]: [number, number]) => (x: number, y: number, z: number): V3 => [
  (x / half) * SIDE, (y / half) * SIDE, Z0 + ((clamp(z, lo, hi) - lo) / (hi - lo)) * ZS,
];
export const onFloor = (half: number) => (x: number, y: number): V3 => [(x / half) * SIDE, (y / half) * SIDE, FLOOR];

/**
 * How far along the floor a move across the picture goes: the picture's (right, down) move of (dx, dy) at `px` to a
 * stage unit, turned back into (x, y) of the function. The floor is a plane, so the same move does it anywhere on it.
 */
export function floorMove(view: { yaw: number; pitch: number }, px: number, half: number, dx: number, dy: number): P2 {
  const o = seen([0, 0, 0], view);
  const ex = seen([1, 0, 0], view);
  const ey = seen([0, 1, 0], view);
  // Picture move = px · (a·X + b·Y), with the picture's y down.
  const [a1, a2, b1, b2] = [ex[0] - o[0], -(ex[1] - o[1]), ey[0] - o[0], -(ey[1] - o[1])];
  const det = a1 * b2 - b1 * a2;
  if (Math.abs(det) < 1e-9) return [0, 0];
  const [u, v] = [dx / px, dy / px];
  const X = (u * b2 - b1 * v) / det;
  const Y = (a1 * v - a2 * u) / det;
  return [(X / SIDE) * half, (Y / SIDE) * half];
}
