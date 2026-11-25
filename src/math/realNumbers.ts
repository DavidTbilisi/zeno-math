// Real numbers. A square root squeezed between whole numbers, then tenths, then hundredths: the piece `rootZoom` has the
// learner tap the piece of the line where the squares turn from less than n to more, one decimal place at a time. For
// a number like 2.25 it stops (√2.25 = 1.5: rational); for 2 it never does. `rootLineSvg` draws √n between two whole
// numbers with their squares, for the practice pictures.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;

/** √n on a number line between ⌊√n⌋ and the next whole number, the squares written above. */
export function rootLineSvg(n: number): { body: string; w: number; h: number } {
  const a = Math.floor(Math.sqrt(n));
  const [lo, hi] = [Math.max(0, a - 1), a + 2];
  const [x0, x1, y] = [30, 390, 70];
  const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const out: string[] = [`<line x1="${x0 - 10}" y1="${y}" x2="${x1 + 10}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`];
  for (let v = lo; v <= hi; v++)
    out.push(
      `<line x1="${X(v)}" y1="${y - 7}" x2="${X(v)}" y2="${y + 7}" stroke="${C.ink}" stroke-width="2"/>`,
      `<text x="${X(v)}" y="${y + 26}" font-size="15" font-weight="700" text-anchor="middle" ${font} fill="${C.ink}">${v}</text>`,
      `<text x="${X(v)}" y="${y - 16}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}">${v}² = ${v * v}</text>`,
    );
  const p = X(Math.sqrt(n));
  out.push(`<circle cx="${p.toFixed(1)}" cy="${y}" r="6" fill="${C.orange}"/><text x="${p.toFixed(1)}" y="${y + 46}" font-size="15" font-weight="700" text-anchor="middle" ${font} fill="${C.orange}">√${n}</text>`);
  return { body: out.join(""), w: 420, h: 130 };
}

/** The piece: which number's root, the digits found so far (the whole part first), and a wrong tap to explain. */
export type LiveRootZoom = { n: number; digits: number[]; miss: number | null };
export const ROOT_NS: readonly number[] = [2, 3, 5, 7, 2.25, 6.25];
export const ROOT_START: LiveRootZoom = { n: 2, digits: [], miss: null };
/** How many places after the point the piece goes before it says the root never ends. */
export const ROOT_PLACES = 5;

/** Where the line starts and how wide each of its ten pieces is, after the digits found so far. */
export function zoomOf(digits: readonly number[]): { lo: number; step: number } {
  const lo = digits.reduce((s, d, i) => s + d * 10 ** -i, 0);
  return { lo, step: 10 ** -digits.length };
}
const EPS = 1e-12;
/** Whether √n lies in the piece of the line from `x` to `x + step` (an exact root at its left end counts). */
export const holds = (n: number, x: number, step: number) => x * x <= n + EPS && (x + step) * (x + step) > n + EPS;
/** The root found exactly: a tick whose square is n. */
export const exactAt = (n: number, digits: readonly number[]) => {
  const { lo } = zoomOf(digits);
  return Math.abs(lo * lo - n) < 1e-9 && digits.length > 0;
};
