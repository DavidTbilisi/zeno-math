// The live number line: any range, any step. From, to and step are typed as whole numbers, decimals (a point or a
// comma) or fractions (1/4, 1 1/2), negative too; the line gets a tick at every step from `from` up to `to`, at most
// NUMBER_LINE_MAX_TICKS of them, and numbers as many of them as there is room to read. Labels are decimals or, if
// asked for, fractions. Clicking marks the nearest tick, and a mark can be dragged along the ticks, alone or with all
// the others the same way (so the gaps between them stay the same); with jumps on, the marks are joined in the order they were
// made, each jump labelled with how far it goes (+3, −1/2).

export type LiveNumberLine = { from: number; to: number; step: number; fractions: boolean; marks: number[]; jumps: boolean; together: boolean };

export const NUMBER_LINE_MAX_TICKS = 100;

/** Ready-made ranges: whole numbers, both sides of 0, tens, hundreds, quarters and tenths. */
export const NUMBER_LINE_RANGES: { from: number; to: number; step: number; fractions: boolean }[] = [
  { from: 0, to: 10, step: 1, fractions: false },
  { from: 0, to: 20, step: 1, fractions: false },
  { from: -10, to: 10, step: 1, fractions: false },
  { from: 0, to: 100, step: 10, fractions: false },
  { from: 0, to: 1000, step: 100, fractions: false },
  { from: 0, to: 1, step: 0.25, fractions: true },
  { from: 0, to: 1, step: 0.1, fractions: false },
];

/** Floating-point dust off: 0.1 + 0.2 is 0.3 here. */
export const clean = (x: number) => Number(x.toPrecision(12));

/** "3", "-2.5", "2,5", "−1/4", "1 1/2", "-1 1/2", "10 000"; null for anything else. */
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(/[−–]/g, "-").replace(/,/g, ".").replace(/\s+/g, " ");
  let m: RegExpExecArray | null;
  if ((m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(s))) {
    const d = Number(m[4]);
    return d ? (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / d) : null;
  }
  if ((m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s))) {
    const d = Number(m[2]);
    return d ? clean(Number(m[1]) / d) : null;
  }
  const plain = s.replace(/(\d) (?=\d{3}\b)/g, "$1"); // 10 000 → 10000
  return /^-?(\d+(\.\d*)?|\.\d+)$/.test(plain) ? Number(plain) : null;
}

/** What is wrong with a range, if anything. */
export type RangeProblem = "step" | "order" | "many";
export function rangeProblem(from: number, to: number, step: number): RangeProblem | null {
  if (!(Number.isFinite(step) && step > 0)) return "step";
  if (!(Number.isFinite(from) && Number.isFinite(to) && to > from)) return "order";
  return (to - from) / step > NUMBER_LINE_MAX_TICKS + 1e-9 ? "many" : null;
}

/** Every tick from `from` to `to` (the last one at or just before `to`). */
export function ticksOf(from: number, to: number, step: number): number[] {
  if (rangeProblem(from, to, step)) return [];
  const n = Math.floor((to - from) / step + 1e-9);
  return Array.from({ length: n + 1 }, (_, i) => clean(from + i * step));
}

/** The nearest fraction with a denominator up to `maxD` (continued fractions). */
export function toFraction(x: number, maxD = 1000): { n: number; d: number } {
  const sign = x < 0 ? -1 : 1;
  let v = Math.abs(x);
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(v);
    const [h2, k2] = [a * h1 + h0, a * k1 + k0];
    if (k2 > maxD) break;
    [h0, h1, k0, k1] = [h1, h2, k1, k2];
    const rest = v - a;
    if (rest < 1e-9 || Math.abs(h1 / k1 - Math.abs(x)) < 1e-9) break;
    v = 1 / rest;
  }
  return { n: sign * h1, d: k1 };
}

/** Decimal places worth showing for a value (at most 6). */
function placesOf(x: number) {
  const s = String(clean(x));
  if (s.includes("e")) return 6;
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : Math.min(6, s.length - dot - 1);
}

const MINUS = "−";

/**
 * A number as the line writes it: a decimal with no more places than the step and the start need (a third is 0.333),
 * or a fraction in its lowest terms (5/4, −1/2); a minus sign, not a hyphen, and big whole numbers in groups of three.
 */
export function formatNumber(v: number, { fractions, step, from }: { fractions: boolean; step: number; from: number }): string {
  if (fractions) {
    const { n, d } = toFraction(v);
    const s = d === 1 ? String(Math.abs(n)) : `${Math.abs(n)}/${d}`;
    return n < 0 ? MINUS + s : s;
  }
  const places = Math.min(3, Math.max(placesOf(step), placesOf(from)));
  const s = String(Number(Math.abs(v).toFixed(places)));
  const out = Math.abs(v) >= 10000 && !s.includes(".") ? s.replace(/\B(?=(\d{3})+$)/g, " ") : s;
  return clean(v) < 0 && Number(s) !== 0 ? MINUS + out : out;
}

/** How far a jump goes, with its sign: +3, −1/2. */
export const formatJump = (from: number, to: number, o: { fractions: boolean; step: number; from: number }) =>
  (to >= from ? "+" : MINUS) + formatNumber(Math.abs(clean(to - from)), o);

/**
 * Which ticks are numbered: every k-th, k the smallest of 1, 2, 5, 10, 20, … that leaves room for the widest label.
 * Counted from the multiples of k steps (0, 5, 10 …) when the start is a whole number of steps, so the numbered ticks
 * are the round ones; otherwise from the start.
 */
export function labelEvery(ticks: number[], step: number, spacing: number, widest: number): (i: number) => boolean {
  const needed = (widest + 10) / Math.max(spacing, 1e-9);
  let k = 1;
  for (const m of [1, 2, 5, 10, 20, 50, 100, 200]) {
    k = m;
    if (m >= needed) break;
  }
  const base = ticks.length ? ticks[0] / step : 0;
  const whole = Math.abs(base - Math.round(base)) < 1e-6;
  return (i) => {
    const j = whole ? Math.round(base) + i : i;
    return ((j % k) + k) % k === 0;
  };
}

/** The tick nearest a value. */
export function nearestTick(ticks: number[], v: number): number {
  let best = ticks[0];
  for (const t of ticks) if (Math.abs(t - v) < Math.abs(best - v)) best = t;
  return best;
}

/** A click on a tick marks it, or unmarks it if it was marked. */
export const toggleMark = (marks: number[], v: number) => (marks.some((m) => Math.abs(m - v) < 1e-9) ? marks.filter((m) => Math.abs(m - v) >= 1e-9) : [...marks, v]);

/** A mark dragged to another tick keeps its place in the order; one already there gives way to it. */
export const moveMark = (marks: number[], i: number, v: number) =>
  marks.flatMap((m, j) => (j === i ? [v] : Math.abs(m - v) < 1e-9 ? [] : [m]));

/**
 * Mark i dragged to v with all the others coming the same way, so every gap between them stays the same; they stop
 * together where the first of them reaches an end of the line.
 */
export function moveTogether(marks: number[], i: number, v: number, from: number, to: number): number[] {
  const by = Math.max(from - Math.min(...marks), Math.min(to - Math.max(...marks), v - marks[i]));
  return marks.map((m) => clean(m + by));
}

/** A new range: the marks outside it go. */
export function withRange(d: LiveNumberLine, r: { from: number; to: number; step: number; fractions?: boolean }): LiveNumberLine {
  return { ...d, ...r, marks: d.marks.filter((m) => m >= r.from - 1e-9 && m <= r.to + 1e-9) };
}

/** The sum the jumps write, from the marks in the order they were made: 3 + 4 − 2 = 5. */
export function jumpSum(marks: number[], o: { fractions: boolean; step: number; from: number }): string | null {
  if (marks.length < 2) return null;
  const hops = marks.slice(1).map((m, i) => formatJump(marks[i], m, o).replace(/^([+−])/, "$1 "));
  return `${formatNumber(marks[0], o)} ${hops.join(" ")} = ${formatNumber(marks[marks.length - 1], o)}`;
}
