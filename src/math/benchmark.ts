// Closer to? A number and two or three benchmarks: which is it nearest? Easy: a whole number between two tens, or
// against 0, 50 and 100; medium: a fraction or a decimal against 0, ½ and 1; hard: a sum, product or quotient against
// three round numbers, to be estimated rather than worked out. Never a tie, and never a near one. The answer is the
// benchmark, typed or picked, so the server reads it back like any number. After each pick the board shows where the
// number really is between the benchmarks.
import { rng } from "./random";

export type NearLevel = 1 | 2 | 3;
/** A benchmark: its value, as it is shown (½), as it is typed (1/2), and in LaTeX. */
export type Bench = { v: number; text: string; plain: string; tex: string };
export type NearTask = { level: NearLevel; v: number; text: string; tex: string; options: Bench[]; right: number };

const whole = (v: number): Bench => ({ v, text: String(v), plain: String(v), tex: String(v) });
const HALF: Bench = { v: 0.5, text: "½", plain: "1/2", tex: "\\frac{1}{2}" };
export const nearest = (v: number, options: Bench[]) => options.reduce((best, o, i) => (Math.abs(o.v - v) < Math.abs(options[best].v - v) ? i : best), 0);
/** Whether the nearest benchmark is clearly nearest: the next one is at least a fifth of a gap further away. */
function clear(v: number, options: Bench[]) {
  const d = options.map((o) => Math.abs(o.v - v)).sort((a, b) => a - b);
  const gap = Math.abs(options[1].v - options[0].v);
  return d[1] - d[0] >= 0.2 * gap;
}

export function nearTask(level: NearLevel, next: () => number): NearTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const make = (v: number, text: string, tex: string, options: Bench[]): NearTask | null =>
    clear(v, options) ? { level, v, text, tex, options, right: nearest(v, options) } : null;
  for (;;) {
    let t: NearTask | null;
    if (level === 1) {
      if (next() < 0.6) {
        const n = int(11, 99);
        const ten = Math.floor(n / 10) * 10;
        t = make(n, String(n), String(n), [whole(ten), whole(ten + 10)]);
      } else {
        const n = int(3, 97);
        t = make(n, String(n), String(n), [whole(0), whole(50), whole(100)]);
      }
    } else if (level === 2) {
      const options = [whole(0), HALF, whole(1)];
      if (next() < 0.6) {
        const d = int(3, 12);
        const n = int(1, d - 1);
        t = make(n / d, `${n}/${d}`, `\\frac{${n}}{${d}}`, options);
      } else {
        const v = int(1, 99) / 100;
        t = make(v, String(v), String(v), options);
      }
    } else {
      // A calculation, its value, and three round numbers a unit of its first digit's half apart.
      const kind = int(0, 2);
      const [a, b, c] = [int(12, 98), int(12, 98), int(102, 498)];
      const div = a * b + (c % b);
      const [exact, text, tex] =
        kind === 0 ? [a * b, `${a} × ${b}`, `${a} \\times ${b}`]
        : kind === 1 ? [div / b, `${div} ÷ ${b}`, `${div} \\div ${b}`]
        : [c + a * 7 + b * 3, `${c} + ${a * 7} + ${b * 3}`, `${c} + ${a * 7} + ${b * 3}`];
      const mag = 10 ** Math.floor(Math.log10(exact));
      const r = Math.round(exact / mag) * mag;
      const unit = 10 ** Math.floor(Math.log10(r)) / 2;
      const j = int(0, 2);
      const options = [0, 1, 2].map((k) => whole(r + (k - j) * unit));
      t = options[0].v > 0 ? make(exact, text, tex, options) : null;
    }
    if (t) return t;
  }
}

/** How the benchmark is found, in LaTeX: the distance to each, and for a calculation, its value. */
export function nearSteps(t: NearTask): string[] {
  const dist = (o: Bench) => {
    const d = Math.round(Math.abs(t.v - o.v) * 1000) / 1000;
    return `|${t.level === 3 ? Number(t.v.toFixed(2)) : t.tex} - ${o.tex}| ${Number.isInteger(t.v * 1000) ? "=" : "\\approx"} ${d}`;
  };
  const head = t.level === 3 ? [`${t.tex} ${Number.isInteger(t.v) ? "=" : "\\approx"} ${Number(t.v.toFixed(2))}`] : t.text.includes("/") ? [`${t.tex} \\approx ${Number(t.v.toFixed(3))}`] : [];
  return [...head, t.options.map(dist).join(", \\quad ")];
}

/** The option typed or picked (40, 1/2, ½, 0.5, 75 %), or null. */
export function readBench(src: string): number | null {
  const s = src.trim().replace(/\s*°$/, "").replace("½", "1/2").replace(",", ".").replace(/\s*\/\s*/, "/").replace(/^[−–]/, "-");
  const f = s.match(/^(\d+)\/(\d+)$/);
  if (f) return Number(f[2]) ? Number(f[1]) / Number(f[2]) : null;
  const p = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (p) return Number(p[1]) / 100;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
export type NearVerdict = { ok: true } | { ok: false; problem: "unreadable" | "notOption" } | { ok: false; picked: number };
export function judgeNear(t: Pick<NearTask, "options" | "right">, src: string): NearVerdict {
  const x = readBench(src);
  if (x === null) return { ok: false, problem: "unreadable" };
  const i = t.options.findIndex((o) => Math.abs(o.v - x) < 1e-9);
  if (i < 0) return { ok: false, problem: "notOption" };
  return i === t.right ? { ok: true } : { ok: false, picked: i };
}

// ---------- the board's game ----------

export const ROUND = 8;
export const NEAR_LADDER: { level: NearLevel; seed: number }[] = [
  { level: 1, seed: 101 },
  { level: 1, seed: 102 },
  { level: 1, seed: 103 },
  { level: 2, seed: 111 },
  { level: 2, seed: 112 },
  { level: 2, seed: 113 },
  { level: 3, seed: 121 },
  { level: 3, seed: 122 },
  { level: 3, seed: 123 },
];
export function nearRound(level: NearLevel, seed: number): NearTask[] {
  const next = rng(seed);
  const out: NearTask[] = [];
  while (out.length < ROUND) {
    const t = nearTask(level, next);
    if (!out.some((o) => o.text === t.text)) out.push(t);
  }
  return out;
}
/** Stars for a round of eight: all right three, six or seven two, fewer one. */
export const nearStars = (right: number) => (right >= ROUND ? 3 : right >= ROUND - 2 ? 2 : 1);
/** The endless run's time for a question: four seconds, a tenth less for every right answer in the streak, down to 1.5 s. */
export const nearLimit = (streak: number) => Math.max(1500, Math.round(4000 * 0.9 ** streak));

export type NearNotice = "lightning" | "perfect" | "onTheLine" | "streak10";
export const NEAR_NOTICES: NearNotice[] = ["lightning", "perfect", "onTheLine", "streak10"];
/** What a right pick shows: within a second; a round all right; a calculation's estimate spot on; ten in a row. */
export function nearNotice(t: NearTask, right: boolean, ms: number, round: boolean[] | null, streak: number): NearNotice | null {
  if (!right) return null;
  if (round && round.length === ROUND && round.every(Boolean)) return "perfect";
  if (streak === 10) return "streak10";
  if (t.level === 3 && Math.abs(t.v - t.options[t.right].v) <= 0.02 * t.options[t.right].v) return "onTheLine";
  if (ms <= 1000) return "lightning";
  return null;
}

export type LiveNear = {
  mode: "puzzle" | "endless";
  stage: number;
  level: NearLevel;
  seed: number;
  i: number;
  results: boolean[];
  /** The benchmark picked (its place), -1 when the time ran out, null before. */
  picked: number | null;
  streak: number;
  said: { kind: "notice"; key: NearNotice } | { kind: "done"; stars: number } | null;
};
export const nearNow = (d: Pick<LiveNear, "mode" | "stage" | "level" | "seed" | "i">): NearTask =>
  d.mode === "puzzle" ? nearRound(NEAR_LADDER[d.stage].level, NEAR_LADDER[d.stage].seed)[d.i] : nearTask(d.level, rng(d.seed));
/** Where a value sits on a line from the first benchmark to the last (0 to 1), kept a little inside its ends. */
export const placeOn = (t: NearTask, v: number) => {
  const [lo, hi] = [t.options[0].v, t.options[t.options.length - 1].v];
  return Math.max(-0.08, Math.min(1.08, (v - lo) / (hi - lo)));
};
