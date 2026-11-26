// Reading a function (#655). A function gives each input one output: an input with two arrows out is not a function,
// two inputs sharing an output are fine. Its graph is read across to f(x); its domain is the inputs it has, its range
// the outputs. The average rate of change from a to b is the slope of the chord, (f(b) − f(a))/(b − a): it can be 0
// though the function moved in between. The pictures for the questions are here; the piece `secantRate` has the
// learner drag two points along a curve.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
export type Pt = readonly [number, number];

/** A number as written, with a real minus sign. */
export const sgn = (v: number) => String(Math.round(v * 100) / 100).replace("-", "−");

/** Two ovals of numbers with an arrow from each input to its outputs. */
export function arrowsSvg(xs: readonly number[], ys: readonly number[], pairs: readonly (readonly [number, number])[]) {
  const row = (i: number, n: number) => 30 + (i + 0.5) * (150 / n);
  const out: string[] = [];
  for (const cx of [60, 220]) out.push(`<ellipse cx="${cx}" cy="105" rx="42" ry="88" fill="#f1f3f5" stroke="${C.grey}" stroke-width="1.5"/>`);
  xs.forEach((x, i) => out.push(`<text x="60" y="${row(i, xs.length) + 5}" font-size="16" text-anchor="middle" ${font} fill="${C.ink}">${sgn(x)}</text>`));
  ys.forEach((y, i) => out.push(`<text x="220" y="${row(i, ys.length) + 5}" font-size="16" text-anchor="middle" ${font} fill="${C.ink}">${sgn(y)}</text>`));
  out.push(`<defs><marker id="rf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.blue}"/></marker></defs>`);
  for (const [a, b] of pairs) out.push(`<line x1="78" y1="${row(a, xs.length)}" x2="200" y2="${row(b, ys.length)}" stroke="${C.blue}" stroke-width="2" marker-end="url(#rf-arrow)"/>`);
  return { body: out.join(""), w: 290, h: 205 };
}

/** A table of x and y in two rows. */
export function tableSvg(xs: readonly number[], ys: readonly number[], names: readonly [string, string] = ["x", "y"]) {
  const cw = 52;
  const out: string[] = [];
  [xs, ys].forEach((vs, r) => {
    out.push(`<rect x="0" y="${r * 34}" width="${cw}" height="34" fill="#e7f5ff" stroke="${C.grey}"/>`);
    out.push(`<text x="${cw / 2}" y="${r * 34 + 23}" font-size="16" font-weight="700" text-anchor="middle" ${font} fill="${C.ink}">${names[r]}</text>`);
    vs.forEach((v, i) => {
      out.push(`<rect x="${(i + 1) * cw}" y="${r * 34}" width="${cw}" height="34" fill="#fff" stroke="${C.grey}"/>`);
      out.push(`<text x="${(i + 1.5) * cw}" y="${r * 34 + 23}" font-size="16" text-anchor="middle" ${font} fill="${C.ink}">${sgn(v)}</text>`);
    });
  });
  return { body: out.join(""), w: (xs.length + 1) * cw + 2, h: 70 };
}

/**
 * A graph on a square grid from lo to hi both ways: a path through the points, with a filled dot at each end that is
 * included. `curve` draws through every point as given (dense points for a curve, corners for a broken line).
 */
export function graphSvg(pts: readonly Pt[], o: { lo: number; hi: number; ends?: boolean; label?: string }) {
  const u = 22;
  const n = o.hi - o.lo;
  const X = (x: number) => 20 + (x - o.lo) * u;
  const Y = (y: number) => 20 + (o.hi - y) * u;
  const out: string[] = [];
  for (let v = o.lo; v <= o.hi; v++) {
    const axis = v === 0;
    out.push(`<line x1="${X(v)}" y1="${Y(o.lo)}" x2="${X(v)}" y2="${Y(o.hi)}" stroke="${axis ? C.ink : "#e9ecef"}" stroke-width="${axis ? 1.5 : 1}"/>`);
    out.push(`<line x1="${X(o.lo)}" y1="${Y(v)}" x2="${X(o.hi)}" y2="${Y(v)}" stroke="${axis ? C.ink : "#e9ecef"}" stroke-width="${axis ? 1.5 : 1}"/>`);
    if (v !== 0 && v % 2 === 0) {
      out.push(`<text x="${X(v)}" y="${Y(0) + 15}" font-size="11" text-anchor="middle" ${font} fill="${C.grey}">${sgn(v)}</text>`);
      out.push(`<text x="${X(0) - 5}" y="${Y(v) + 4}" font-size="11" text-anchor="end" ${font} fill="${C.grey}">${sgn(v)}</text>`);
    }
  }
  out.push(`<text x="${X(o.hi) - 4}" y="${Y(0) - 6}" font-size="13" font-style="italic" text-anchor="end" ${font} fill="${C.ink}">x</text>`);
  out.push(`<text x="${X(0) + 6}" y="${Y(o.hi) + 12}" font-size="13" font-style="italic" ${font} fill="${C.ink}">y</text>`);
  out.push(`<polyline points="${pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`);
  if (o.ends) for (const [x, y] of [pts[0], pts[pts.length - 1]]) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" fill="${C.blue}"/>`);
  if (o.label) out.push(`<text x="${X(pts[pts.length - 1][0]) + 6}" y="${Y(pts[pts.length - 1][1]) - 6}" font-size="14" font-style="italic" ${font} fill="${C.blue}">${o.label}</text>`);
  return { body: out.join(""), w: n * u + 40, h: n * u + 40 };
}

/** Two graphs on one grid: the first in blue, the second drawn over it in orange. */
export function graph2Svg(one: readonly Pt[], two: readonly Pt[], o: { lo: number; hi: number }) {
  const a = graphSvg(one, o);
  const b = graphSvg(two, o);
  return { ...a, body: a.body + b.body.slice(b.body.lastIndexOf("<polyline")).replace(/stroke="[^"]*"/, `stroke="${C.orange}"`) };
}

/** The part of y = mx + c inside the square grid from lo to hi, as its two ends. */
export function lineIn(m: number, c: number, lo: number, hi: number): Pt[] {
  if (m === 0) return [[lo, c], [hi, c]];
  const xs = [lo, hi, (lo - c) / m, (hi - c) / m].filter((x) => x >= lo - 1e-9 && x <= hi + 1e-9 && m * x + c >= lo - 1e-9 && m * x + c <= hi + 1e-9).sort((p, q) => p - q);
  return [[xs[0], m * xs[0] + c], [xs[xs.length - 1], m * xs[xs.length - 1] + c]];
}

/** The piece: the two points' inputs, whole numbers from 0 to 7. */
export type LiveSecantRate = { a: number; b: number };
export const SECANT_START: LiveSecantRate = { a: 1, b: 2 };
export const SECANT_MAX = 7;
/** The piece's curve: it rises, falls and rises again, and passes 2 at x = 0, 3 and 6. */
export const secantF = (x: number) => (x * (x - 3) * (x - 6)) / 4 + 2;
/** The average rate of change from a to b (null when they meet). */
export function rateOf(s: LiveSecantRate) {
  if (s.a === s.b) return null;
  const r = (secantF(s.b) - secantF(s.a)) / (s.b - s.a);
  // Never −0, from a flat chord read right to left.
  return r === 0 ? 0 : r;
}
