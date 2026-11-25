// Inequalities in two variables (#656). The line y = mx + c splits the plane; y > mx + c is every point above it,
// y < mx + c every point below, and the line itself counts only with ≥ or ≤ (drawn solid, otherwise dashed). Dividing
// by a negative turns the sign: x − y > 2 is y < x − 2, below its line. A system is the points that pass every test at
// once. `regionSvg` shades a system on a grid for a question; the piece `testPoints` has the learner test points one by
// one until the region shows.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
export type Pt = readonly [number, number];
export type Op = "<" | "≤" | ">" | "≥";
/** y op mx + c. */
export type Ineq = { m: number; c: number; op: Op };

export const holds = (q: Ineq, [x, y]: Pt) => {
  const r = q.m * x + q.c;
  return q.op === "<" ? y < r : q.op === "≤" ? y <= r : q.op === ">" ? y > r : y >= r;
};
export const strict = (op: Op) => op === "<" || op === ">";
export const above = (op: Op) => op === ">" || op === "≥";
/** The sign written the other way round. */
export const FLIP: Record<Op, Op> = { "<": ">", "≤": "≥", ">": "<", "≥": "≤" };
/** The same side with the line in or out. */
export const TOGGLE: Record<Op, Op> = { "<": "≤", "≤": "<", ">": "≥", "≥": ">" };

/** A number with a real minus sign. */
export const sgn = (v: number) => String(Math.round(v * 1000) / 1000).replace("-", "−");
/** mx + c written out: 2x + 1, −x − 3, 4, x. */
export function rhs(m: number, c: number) {
  const mx = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${sgn(m)}x`;
  if (!mx) return sgn(c);
  return c === 0 ? mx : `${mx} ${c < 0 ? "−" : "+"} ${sgn(Math.abs(c))}`;
}
export const ineqText = (q: Ineq) => `y ${q.op} ${rhs(q.m, q.c)}`;

/** The part of a polygon on the side of y = mx + c that `op` keeps (Sutherland–Hodgman, one edge). */
export function clip(poly: readonly Pt[], q: Ineq): Pt[] {
  const s = (p: Pt) => (above(q.op) ? p[1] - (q.m * p[0] + q.c) : q.m * p[0] + q.c - p[1]);
  const out: Pt[] = [];
  poly.forEach((p, i) => {
    const n = poly[(i + 1) % poly.length];
    const [a, b] = [s(p), s(n)];
    if (a >= 0) out.push(p);
    if ((a >= 0) !== (b >= 0)) {
      const t = a / (a - b);
      out.push([p[0] + t * (n[0] - p[0]), p[1] + t * (n[1] - p[1])]);
    }
  });
  return out;
}

/** The square grid from −r to r, as a polygon. */
export const square = (r: number): Pt[] => [[-r, -r], [r, -r], [r, r], [-r, r]];

/**
 * A grid from −6 to 6 with each inequality's line (dashed when strict) and the points where they all hold shaded;
 * named points are dotted and labelled.
 */
export function regionSvg(qs: readonly Ineq[], o: { points?: { p: Pt; name: string }[]; shade?: boolean } = {}) {
  const R = 6;
  const u = 22;
  const X = (x: number) => 20 + (x + R) * u;
  const Y = (y: number) => 20 + (R - y) * u;
  const out: string[] = [];
  for (let v = -R; v <= R; v++) {
    const axis = v === 0;
    const st = `stroke="${axis ? C.ink : "#e9ecef"}" stroke-width="${axis ? 1.5 : 1}"`;
    out.push(`<line x1="${X(v)}" y1="${Y(-R)}" x2="${X(v)}" y2="${Y(R)}" ${st}/><line x1="${X(-R)}" y1="${Y(v)}" x2="${X(R)}" y2="${Y(v)}" ${st}/>`);
    if (v !== 0 && v % 2 === 0)
      out.push(`<text x="${X(v)}" y="${Y(0) + 15}" font-size="11" text-anchor="middle" ${font} fill="${C.grey}">${sgn(v)}</text><text x="${X(0) - 5}" y="${Y(v) + 4}" font-size="11" text-anchor="end" ${font} fill="${C.grey}">${sgn(v)}</text>`);
  }
  if (o.shade !== false) {
    const region = qs.reduce<Pt[]>((poly, q) => (poly.length ? clip(poly, q) : poly), square(R));
    if (region.length > 2) out.push(`<polygon points="${region.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}" fill="${C.blue}" fill-opacity="0.18"/>`);
  }
  qs.forEach((q, i) => {
    const ends = clip(clip(square(R), { ...q, op: "≥" }), { ...q, op: "≤" });
    const [a, b] = ends.length >= 2 ? [ends[0], ends[ends.length - 1]] : [[-R, q.m * -R + q.c] as Pt, [R, q.m * R + q.c] as Pt];
    const color = i ? C.orange : C.blue;
    out.push(`<line x1="${X(a[0]).toFixed(1)}" y1="${Y(a[1]).toFixed(1)}" x2="${X(b[0]).toFixed(1)}" y2="${Y(b[1]).toFixed(1)}" stroke="${color}" stroke-width="2.5"${strict(q.op) ? ` stroke-dasharray="7 5"` : ""}/>`);
  });
  for (const { p, name } of o.points ?? [])
    out.push(`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4.5" fill="${C.red}"/><text x="${X(p[0]) + 6}" y="${Y(p[1]) - 6}" font-size="14" font-weight="700" ${font} fill="${C.red}">${name}</text>`);
  return { body: out.join(""), w: 2 * R * u + 40, h: 2 * R * u + 40 };
}

/** The piece: which inequality, the points tested so far, and the cursor for the keys. */
export type LiveTestPoints = { which: number; tested: Pt[]; at: Pt };
export const TESTPOINTS_START: LiveTestPoints = { which: 0, tested: [], at: [0, 0] };
/** The piece's three inequalities, as written and as y op mx + c. */
export const TEST_INEQS: readonly { text: string; lhs: (p: Pt) => number; rhs: (p: Pt) => number; lhsText: string; rhsText: string; op: Op; q: Ineq }[] = [
  { text: "y < 2x + 1", lhs: ([, y]) => y, rhs: ([x]) => 2 * x + 1, lhsText: "y", rhsText: "2x + 1", op: "<", q: { m: 2, c: 1, op: "<" } },
  { text: "x + y ≥ 3", lhs: ([x, y]) => x + y, rhs: () => 3, lhsText: "x + y", rhsText: "3", op: "≥", q: { m: -1, c: 3, op: "≥" } },
  { text: "x − y > 2", lhs: ([x, y]) => x - y, rhs: () => 2, lhsText: "x − y", rhsText: "2", op: ">", q: { m: 1, c: -2, op: "<" } },
];
/** How many tested points before the region shows, one of them on the line. */
export const TEST_ENOUGH = 8;
export const onLine = (which: number, p: Pt) => TEST_INEQS[which].lhs(p) === TEST_INEQS[which].rhs(p);
export const shown = (s: LiveTestPoints) => s.tested.length >= TEST_ENOUGH && s.tested.some((p) => onLine(s.which, p));
/** A test of the point: added once. */
export const testAt = (s: LiveTestPoints, p: Pt): LiveTestPoints =>
  s.tested.some((t) => t[0] === p[0] && t[1] === p[1]) ? { ...s, at: p } : { ...s, at: p, tested: [...s.tested, p] };
