// Spread (#650): where the middle of a set of data is, and how spread out it is. The median splits the ordered values
// into two halves with as many on each side; the quartiles split each half the same way (with an odd count the median
// itself is left out of both halves), so Q1, the median and Q3 cut the data into four parts of equal size. The box of a
// box plot holds the middle half, from Q1 to Q3, and its length is the interquartile range; the mean absolute deviation
// is the mean distance from the mean. `dotPlotSvg`, `histSvg` and `boxPlotSvg` draw the pictures of the questions; the
// piece `boxSplit` has the learner find the splits by tapping a row of value cards, and the box draws itself.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;

/** The middle of sorted values: the middle one, or halfway between the middle two. */
export function median(sorted: readonly number[]): number {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/** The five-number summary of any values: smallest, Q1, median, Q3, largest (the median left out of both halves). */
export function fiveNumbers(values: readonly number[]) {
  const s = [...values].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return { min: s[0], q1: median(s.slice(0, h)), med: median(s), q3: median(s.slice(s.length - h)), max: s[s.length - 1] };
}

export const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;
/** The mean distance of the values from their mean. */
export const meanAbsDev = (values: readonly number[]) => {
  const m = mean(values);
  return mean(values.map((v) => Math.abs(v - m)));
};

/** A number as written, halves and all: 2.5, 7. */
export const short = (v: number) => String(Number(v.toFixed(2)));

type Pic = { body: string; w: number; h: number };

/** A number line from lo to hi, `u` pixels a unit, its ticks labelled every `every`, at height y. */
function axis(lo: number, hi: number, u: number, x0: number, y: number, every = 1): string {
  const out = [`<line x1="${x0 - 8}" y1="${y}" x2="${x0 + (hi - lo) * u + 8}" y2="${y}" stroke="${C.ink}" stroke-width="1.5"/>`];
  for (let v = lo; v <= hi; v++) {
    const x = x0 + (v - lo) * u;
    // A tick at every whole number while they are far enough apart; else only at the labelled ones.
    if (u < 6 && (v - lo) % every) continue;
    out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 5}" stroke="${C.ink}"/>`);
    if ((v - lo) % every === 0) out.push(`<text x="${x}" y="${y + 19}" font-size="12" text-anchor="middle" ${font} fill="${C.ink}">${v}</text>`);
  }
  return out.join("");
}

/** A dot plot: one dot for each value, stacked over the number line from lo to hi. */
export function dotPlotSvg(values: readonly number[], lo: number, hi: number, label: string): Pic {
  const u = Math.max(26, Math.min(40, 360 / (hi - lo)));
  const x0 = 24;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tall = Math.max(...counts.values());
  const y = 20 + tall * 18;
  const dots = [...counts].flatMap(([v, c]) => Array.from({ length: c }, (_, i) => `<circle cx="${x0 + (v - lo) * u}" cy="${y - 11 - i * 18}" r="7" fill="${C.blue}"/>`));
  const w = (hi - lo) * u + 2 * x0;
  return { body: dots.join("") + axis(lo, hi, u, x0, y) + `<text x="${w / 2}" y="${y + 38}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}">${label}</text>`, w, h: y + 46 };
}

/** A histogram of equal bins from `from` in steps of `step`, with the counts given, and a count axis. */
export function histSvg(from: number, step: number, counts: readonly number[], label: string): Pic {
  const bw = 56;
  const x0 = 40;
  const top = Math.max(...counts);
  const u = 150 / top;
  const base = 170;
  const out: string[] = [];
  for (let c = 0; c <= top; c += top > 10 ? 2 : 1) {
    out.push(`<line x1="${x0}" y1="${base - c * u}" x2="${x0 + counts.length * bw}" y2="${base - c * u}" stroke="#dee2e6"/>`);
    out.push(`<text x="${x0 - 6}" y="${base - c * u + 4}" font-size="11" text-anchor="end" ${font} fill="${C.ink}">${c}</text>`);
  }
  counts.forEach((c, i) => out.push(`<rect x="${x0 + i * bw}" y="${base - c * u}" width="${bw}" height="${c * u}" fill="${C.blue}" fill-opacity="0.75" stroke="#fff" stroke-width="1.5"/>`));
  for (let i = 0; i <= counts.length; i++)
    out.push(`<text x="${x0 + i * bw}" y="${base + 17}" font-size="12" text-anchor="middle" ${font} fill="${C.ink}">${from + i * step}</text>`);
  out.push(`<line x1="${x0}" y1="${base}" x2="${x0 + counts.length * bw}" y2="${base}" stroke="${C.ink}" stroke-width="1.5"/>`);
  const w = x0 + counts.length * bw + 20;
  out.push(`<text x="${(x0 + w) / 2}" y="${base + 36}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}">${label}</text>`);
  return { body: out.join(""), w, h: base + 44 };
}

export type Five = ReturnType<typeof fiveNumbers>;

/** One or more box plots over one number line from lo to hi, each with its name on the left. */
export function boxPlotSvg(boxes: readonly { name: string; f: Five }[], lo: number, hi: number, every = 1): Pic {
  const u = Math.min(30, 420 / (hi - lo));
  const x0 = boxes.some((b) => b.name) ? 70 : 24;
  const X = (v: number) => x0 + (v - lo) * u;
  const out: string[] = [];
  boxes.forEach(({ name, f }, i) => {
    const y = 26 + i * 56;
    const color = i ? C.orange : C.blue;
    out.push(`<line x1="${X(f.min)}" y1="${y}" x2="${X(f.q1)}" y2="${y}" stroke="${C.ink}" stroke-width="1.5"/>`);
    out.push(`<line x1="${X(f.q3)}" y1="${y}" x2="${X(f.max)}" y2="${y}" stroke="${C.ink}" stroke-width="1.5"/>`);
    for (const v of [f.min, f.max]) out.push(`<line x1="${X(v)}" y1="${y - 9}" x2="${X(v)}" y2="${y + 9}" stroke="${C.ink}" stroke-width="1.5"/>`);
    out.push(`<rect x="${X(f.q1)}" y="${y - 16}" width="${(f.q3 - f.q1) * u}" height="32" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>`);
    out.push(`<line x1="${X(f.med)}" y1="${y - 16}" x2="${X(f.med)}" y2="${y + 16}" stroke="${color}" stroke-width="3"/>`);
    if (name) out.push(`<text x="10" y="${y + 5}" font-size="13" font-weight="700" ${font} fill="${color}">${name}</text>`);
  });
  const y = 26 + boxes.length * 56 - 14;
  const w = X(hi) + 24;
  return { body: out.join("") + axis(lo, hi, u, x0, y, every), w, h: y + 28 };
}

/**
 * The piece: which row of values, and where the learner has cut it. A position is 0 … 2n − 2 along the row: an even
 * one is a card (position 2i is card i), an odd one the gap between two cards. miss: the last tap that didn't split.
 */
export type LiveBoxSplit = { set: number; med: number | null; q1: number | null; q3: number | null; miss: number | null };
/** The rows the piece offers, each already in order: odd, even, and one with a far value. */
export const BOX_SETS: readonly (readonly number[])[] = [
  [3, 4, 4, 6, 7, 8, 9, 11, 12, 12, 15],
  [10, 12, 13, 15, 16, 18, 20, 21, 25, 30],
  [1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 20],
];
export const BOX_START: LiveBoxSplit = { set: 0, med: null, q1: null, q3: null, miss: null };

/** Where the median and the quartiles fall along a row of n cards. */
export function cutsOf(n: number) {
  const h = Math.floor(n / 2);
  return { med: n - 1, q1: h - 1, q3: 2 * n - h - 1 };
}
/** The value at a position: a card's, or halfway between the two cards beside a gap. */
export const valueAt = (vs: readonly number[], p: number) => (p % 2 ? (vs[(p - 1) / 2] + vs[(p + 1) / 2]) / 2 : vs[p / 2]);
/** How many cards lie wholly to the left of a position, and to the right, counting only cards from `from` to `to`. */
export function sides(p: number, from: number, to: number) {
  const left = Math.max(0, Math.min(to + 1, Math.ceil(p / 2)) - from);
  const right = Math.max(0, to - Math.max(from - 1, Math.floor(p / 2)));
  return { left, right };
}

/** A tap at position p: the cut it makes, or a miss. The median first; then a quartile in whichever half it falls in. */
export function tapAt(s: LiveBoxSplit, p: number): LiveBoxSplit {
  const n = BOX_SETS[s.set].length;
  const c = cutsOf(n);
  if (s.med === null) return p === c.med ? { ...s, med: p, miss: null } : { ...s, miss: p };
  if (p < c.med && s.q1 === null) return p === c.q1 ? { ...s, q1: p, miss: null } : { ...s, miss: p };
  if (p > c.med && s.q3 === null) return p === c.q3 ? { ...s, q3: p, miss: null } : { ...s, miss: p };
  return s;
}
/** The cards a tap at p is weighed against: the whole row before the median is found, else the half it falls in. */
export function regionOf(s: LiveBoxSplit, p: number): { from: number; to: number } {
  const n = BOX_SETS[s.set].length;
  const h = Math.floor(n / 2);
  if (s.med === null) return { from: 0, to: n - 1 };
  return p < n - 1 ? { from: 0, to: h - 1 } : { from: n - h, to: n - 1 };
}
