// Absolute value as a distance. |x − a| is how far x is from a on the number line, whichever side it is on, so
// |x − a| = b is met by two numbers, b to the left of a and b to the right, and |x − a| < b by every number between
// them. `absLineSvg` draws a number line with marked points, distances as arcs and a shaded stretch, for questions and
// their working; the piece `absLine` has the learner drag a point until it is b from a, and find there are two.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
const U = 26;
const PAD = 22;

/** A number as it is written, with a true minus sign. */
export const signed = (v: number) => (v < 0 ? `−${-v}` : String(v));

export type LineMark = { v: number; label?: string; color?: string };
export type LineArc = { from: number; to: number; label: string; color?: string };
export type LineShade = { lo: number; hi: number; closed: boolean };

/** The number line from `lo` to `hi`, its points, its distances as arcs above it, and a stretch shaded on it. */
export function absLineSvg(lo: number, hi: number, marks: LineMark[], arcs: LineArc[] = [], shade?: LineShade): { body: string; w: number; h: number } {
  // Room above the line only when there are arcs to draw in it.
  const y = arcs.length ? 74 : 22;
  const X = (v: number) => PAD + (v - lo) * U;
  const out: string[] = [];
  if (shade) {
    out.push(`<line x1="${X(shade.lo)}" y1="${y}" x2="${X(shade.hi)}" y2="${y}" stroke="${C.green}" stroke-width="8" stroke-opacity="0.45" stroke-linecap="butt"/>`);
    for (const v of [shade.lo, shade.hi]) out.push(`<circle cx="${X(v)}" cy="${y}" r="6" fill="${shade.closed ? C.green : "#fff"}" stroke="${C.green}" stroke-width="2.5"/>`);
  }
  out.push(`<line x1="${X(lo) - 10}" y1="${y}" x2="${X(hi) + 10}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let v = lo; v <= hi; v++)
    out.push(`<line x1="${X(v)}" y1="${y - 5}" x2="${X(v)}" y2="${y + 5}" stroke="${C.ink}"/><text x="${X(v)}" y="${y + 21}" font-size="11" text-anchor="middle" ${font} fill="${v === 0 ? C.ink : C.grey}" font-weight="${v === 0 ? 700 : 400}">${signed(v)}</text>`);
  for (const a of arcs) {
    const [x1, x2] = [X(a.from), X(a.to)];
    const top = y - 14 - Math.min(40, Math.abs(x2 - x1) * 0.35);
    const color = a.color ?? C.blue;
    out.push(`<path d="M${x1} ${y - 8} Q ${(x1 + x2) / 2} ${2 * top - y + 8} ${x2} ${y - 8}" fill="none" stroke="${color}" stroke-width="2"/>`);
    out.push(`<text x="${(x1 + x2) / 2}" y="${top - 4}" font-size="13" font-weight="700" text-anchor="middle" ${font} fill="${color}">${a.label}</text>`);
  }
  for (const m of marks) {
    out.push(`<circle cx="${X(m.v)}" cy="${y}" r="5.5" fill="${m.color ?? C.red}"/>`);
    if (m.label) out.push(`<text x="${X(m.v)}" y="${y + 40}" font-size="13" font-weight="700" text-anchor="middle" ${font} fill="${m.color ?? C.red}">${m.label}</text>`);
  }
  return { body: out.join(""), w: (hi - lo) * U + 2 * PAD, h: y + 50 };
}

/** The piece: which equation is being solved, where the dragged point is, and the answers found so far. */
export type LiveAbsLine = { task: number; x: number; found: number[] };
/** The equations |x − a| = b the piece offers; b = 0 has one answer only. */
export const ABS_TASKS = [
  { a: 3, b: 4 },
  { a: -2, b: 5 },
  { a: 0, b: 6 },
  { a: 1, b: 0 },
];
export const ABS_LO = -10;
export const ABS_HI = 10;
export const ABS_START: LiveAbsLine = { task: 0, x: 0, found: [] };
/** The answers of task i, smallest first. */
export const absAnswers = (i: number) => {
  const { a, b } = ABS_TASKS[i];
  return b === 0 ? [a] : [a - b, a + b];
};
