// Solids of revolution for the 3D view: the region between y = f(x) and y = g(x) (the x-axis when g is left empty)
// on a ≤ x ≤ b, turned about the x-axis (discs, or washers) or the y-axis (shells). It gives the region as columns
// for the drawing, the same region cut into n slabs (the sum the integral is the limit of), the volume, and the
// volume as kπ when f and g are polynomials with rational limits and the exact integral agrees with the numbers.
import { approx, evalE, exprMessages, F, has, isNum, mul, parseE, pow, simp, sub, toPoly, X, type E } from "./expr";
import type { Frac } from "./fraction";
import { fill } from "./text";

export type RevAxis = "x" | "y";
export type RevMethod = "disc" | "washer" | "shell";
/** What is typed: f and g as expressions in x (g may be empty), a and b as numbers (π allowed), n slabs (0 = none). */
export type RevInput = { f: string; g: string; a: string; b: string; axis: RevAxis; slices: number };

export type RevWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  needLimits: string;
  undefinedOn: string;
  oneSide: string;
  /** The slabs' sum: {m} method, {n} slabs, {v} their volume. */
  slabSum: string;
  methods: Record<RevMethod, string>;
};

/** One vertical cut through the region: from lo up to hi at x. */
export type Column = { x: number; lo: number; hi: number };

export type Revolution = {
  method: RevMethod;
  a: number;
  b: number;
  /** The region, sampled finely enough to draw. */
  columns: Column[];
  /** The region cut into n slabs, each as its two edge columns, with the height taken at the middle of the slab. */
  slabs: [Column, Column][];
  volume: number;
  /** "32π/5" when the volume is known exactly, else null. */
  exact: string | null;
  /** The sum over the slabs (NaN with no slabs). */
  approx: number;
  /** How far the full solid reaches from the axis, and along it. */
  reach: number;
  along: [number, number];
};

const SAMPLES = 160;
export const MAX_SLICES = 40;

/** The volume swept by one column per unit of x: π(R² − r²) about the x-axis, 2π|x|·height about the y-axis. */
function density(axis: RevAxis, c: Column): number {
  if (axis === "y") return 2 * Math.PI * Math.abs(c.x) * (c.hi - c.lo);
  const [p, q] = [Math.abs(c.lo), Math.abs(c.hi)];
  const R = Math.max(p, q);
  const r = c.lo <= 0 && c.hi >= 0 ? 0 : Math.min(p, q);
  return Math.PI * (R * R - r * r);
}

/** A number typed as a limit: 2, -3, 1/2, pi, sqrt(2). */
function limit(src: string, w: RevWords): { v: number; q: Frac | null } {
  const e = simp(parseE(src));
  if (has(e)) throw new Error(w.needLimits);
  const v = isNum(e) ? e.v.toNumber() : evalE(e, 0);
  if (!Number.isFinite(v)) throw new Error(w.needLimits);
  return { v, q: isNum(e) ? e.v : null };
}

/** ∫ₐᵇ p(x) dx for a polynomial with rational coefficients and limits, or null when the numbers get too big. */
function polyIntegral(p: Frac[], a: Frac, b: Frac): Frac | null {
  try {
    let sum = F(0);
    let [ak, bk] = [a, b];
    for (let k = 0; k < p.length; k++) {
      sum = sum.add(p[k].mul(bk.sub(ak)).div(F(k + 1)));
      [ak, bk] = [ak.mul(a), bk.mul(b)];
    }
    return Number.isSafeInteger(sum.n) && Number.isSafeInteger(sum.d) ? sum : null;
  } catch {
    return null;
  }
}

/** kπ as text: π, 8π, 32π/5, π/2. */
export function piText(k: Frac): string {
  return `${k.n === 1 ? "" : k.n}π${k.d === 1 ? "" : `/${k.d}`}`;
}

export function revolve(s: RevInput, w: RevWords): Revolution {
  exprMessages(w);
  if (!s.a.trim() || !s.b.trim()) throw new Error(w.needLimits);
  const f = parseE(s.f);
  const hasG = !!s.g.trim();
  const g: E = hasG ? parseE(s.g) : { k: "num", v: F(0) };
  let A = limit(s.a, w);
  let B = limit(s.b, w);
  if (A.v > B.v) [A, B] = [B, A];
  if (B.v - A.v < 1e-9) throw new Error(w.needLimits);
  const [a, b] = [A.v, B.v];
  if (s.axis === "y" && a < -1e-12 && b > 1e-12) throw new Error(w.oneSide);

  const column = (x: number): Column => {
    const [fy, gy] = [evalE(f, x), evalE(g, x)];
    if (!Number.isFinite(fy) || !Number.isFinite(gy)) throw new Error(fill(w.undefinedOn, { x: approx(x) }));
    return { x, lo: Math.min(fy, gy), hi: Math.max(fy, gy) };
  };
  const at = (i: number, n: number) => (i === n ? b : a + ((b - a) * i) / n);
  const columns = Array.from({ length: SAMPLES + 1 }, (_, i) => column(at(i, SAMPLES)));

  let reach = 0;
  let [lo, hi] = [0, 0];
  for (const c of columns) {
    reach = Math.max(reach, s.axis === "x" ? Math.max(Math.abs(c.lo), Math.abs(c.hi)) : Math.abs(c.x));
    [lo, hi] = [Math.min(lo, c.lo), Math.max(hi, c.hi)];
  }
  if (reach > 1e4 || hi - lo > 1e4) throw new Error(w.tooBig);
  const along: [number, number] = s.axis === "x" ? [a, b] : [lo, hi];

  // Simpson on a fine grid; corners where the curves cross the axis or each other cost only a little accuracy.
  const N = 6000;
  const h = (b - a) / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) sum += density(s.axis, column(at(i, N))) * (i === 0 || i === N ? 1 : i % 2 ? 4 : 2);
  const volume = (sum * h) / 3;

  const n = Math.max(0, Math.min(MAX_SLICES, Math.round(s.slices)));
  const slabs: [Column, Column][] = [];
  let approxSum = 0;
  for (let k = 0; k < n; k++) {
    const [x0, x1] = [at(k, n), at(k + 1, n)];
    const m = column((x0 + x1) / 2);
    slabs.push([{ ...m, x: x0 }, { ...m, x: x1 }]);
    approxSum += density(s.axis, m) * (x1 - x0);
  }

  return {
    method: s.axis === "y" ? "shell" : hasG ? "washer" : "disc",
    a,
    b,
    columns,
    slabs,
    volume,
    exact: exactVolume(f, g, s.axis, A.q, B.q, volume),
    approx: n ? approxSum : NaN,
    reach,
    along,
  };
}

/**
 * With polynomials and rational limits: π∫(f² − g²) dx or 2π∫x(f − g) dx done exactly. Kept only when it matches
 * the numbers, which it does unless the region crosses the axis or the curves cross (then the radii swap over).
 */
function exactVolume(f: E, g: E, axis: RevAxis, a: Frac | null, b: Frac | null, volume: number): string | null {
  if (!a || !b) return null;
  const p = toPoly(simp(axis === "x" ? sub(pow(f, 2), pow(g, 2)) : mul(X, sub(f, g))));
  if (!p) return null;
  const I = polyIntegral(p, a, b);
  if (!I) return null;
  const k = I.abs().mul(F(axis === "x" ? 1 : 2));
  const v = k.toNumber() * Math.PI;
  if (Math.abs(v - volume) > 1e-6 * Math.max(1, volume)) return null;
  return k.isZero() ? "0" : piText(k);
}

/** What is typed, as it is read: x², π, √, −. */
export const pretty = (src: string) =>
  src
    .trim()
    .replace(/\*\*/g, "^")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\bpi\b/g, "π")
    .replace(/sqrt/g, "√")
    .replace(/\*/g, "·")
    .replace(/-/g, "−");

/** The caption under the picture: the region, the integral with its value, and the slabs' sum. */
export function revCaption(s: RevInput, r: Revolution, w: RevWords): string[] {
  const hasG = !!s.g.trim();
  const region = `${hasG ? `f(x) = ${pretty(s.f)}, g(x) = ${pretty(s.g)}` : `f(x) = ${pretty(s.f)}`}, ${approx(r.a)} ≤ x ≤ ${approx(r.b)}`;
  const integral =
    r.method === "disc" ? "V = π∫ f(x)² dx"
    : r.method === "washer" ? "V = π∫ (R² − r²) dx"
    : `V = 2π∫ ${r.b <= 0 ? "|x|" : "x"} · ${hasG ? "(f(x) − g(x))" : "f(x)"} dx`;
  const lines = [region, `${integral} ${r.exact ? `= ${r.exact} ` : ""}≈ ${approx(r.volume)}`];
  if (r.slabs.length) lines.push(fill(w.slabSum, { m: w.methods[r.method], n: r.slabs.length, v: approx(r.approx) }));
  return lines;
}
