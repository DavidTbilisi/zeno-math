// Quick look: dots shown for a moment, then hidden — how many were there? Seeing a small number at a glance, and a
// bigger one as groups (a ten frame as ten take away the gaps, 4 and 3 as 7), is where number sense starts. The dots
// come as a die, two dice, a ten frame or two, groups, or scattered. Easy: 1 to 6; medium: 5 to 10; hard: 11 to 20.
// The answer is the number, typed or tapped, so the checker reads it like any other. The board's game plays rounds of
// five flashes, with stars for how many were right, and an endless run whose flash gets shorter with every right one.
import { rng } from "./random";

export type LookLevel = 1 | 2 | 3;
export type LookKind = "die" | "dice" | "frame" | "frames" | "groups" | "scatter";
/** A dot at (x, y) in a box of LOOK_W × LOOK_H, and the group it belongs to. */
export type Dot = { x: number; y: number; g: number };
export type LookTask = { level: LookLevel; kind: LookKind; n: number; parts: number[]; dots: Dot[] };

export const LOOK_W = 320;
export const LOOK_H = 200;
/** How long the dots show at each level, in milliseconds. */
export const FLASH_MS: Record<LookLevel, number> = { 1: 1500, 2: 1200, 3: 1200 };
export const MIN_FLASH_MS = 500;
export const ROUND = 5;

/** The pips of a die from 1 to 6, on a 3 × 3 grid. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
const die = (n: number, cx: number, cy: number, size: number, g: number): Dot[] => PIPS[n].map(([i, j]) => ({ x: cx + (i - 1) * size, y: cy + (j - 1) * size, g }));

/** Cells of ten frames, filled a row at a time, five to a row; a second frame under the first, a single one in the middle. */
export const frameCell = (k: number, frames: 1 | 2 = 2): { x: number; y: number } => {
  const frame = Math.floor(k / 10);
  const r = Math.floor((k % 10) / 5);
  const c = k % 5;
  return { x: 60 + c * 50, y: (frames === 1 ? 78 : 35) + r * 44 + frame * 108 };
};

/** Dots spread over the box, never closer than 34 apart, from `next`. */
function scatter(n: number, next: () => number): Dot[] {
  const out: Dot[] = [];
  for (let tries = 0; out.length < n; tries++) {
    const p = { x: 30 + next() * (LOOK_W - 60), y: 25 + next() * (LOOK_H - 50), g: 0 };
    if (tries > 5000 || out.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 34)) out.push(p);
  }
  return out;
}

/** Groups side by side, each like a die face (up to 6), so each can be seen at a glance. */
function groups(parts: number[]): Dot[] {
  const step = LOOK_W / parts.length;
  return parts.flatMap((k, g) => die(k, step * (g + 0.5), LOOK_H / 2, Math.min(26, step / 4), g));
}

export function lookTask(level: LookLevel, next: () => number): LookTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const make = (kind: LookKind, parts: number[], dots: Dot[]): LookTask => ({ level, kind, n: parts.reduce((s, k) => s + k, 0), parts, dots });
  if (level === 1) {
    if (next() < 0.5) {
      const n = int(1, 6);
      return make("die", [n], die(n, LOOK_W / 2, LOOK_H / 2, 46, 0));
    }
    const n = int(1, 5);
    return make("scatter", [n], scatter(n, next));
  }
  if (level === 2) {
    const kind = int(0, 2);
    if (kind === 0) {
      const n = int(5, 10);
      return make("frame", [n], Array.from({ length: n }, (_, k) => ({ ...frameCell(k, 1), g: k < 5 ? 0 : 1 })));
    }
    if (kind === 1) {
      const [a, b] = [int(2, 6), int(2, 6)];
      return make("dice", [a, b], [...die(a, LOOK_W / 4, LOOK_H / 2, 34, 0), ...die(b, (3 * LOOK_W) / 4, LOOK_H / 2, 34, 1)]);
    }
    const parts = [int(2, 5), int(2, 5)];
    return make("groups", parts, groups(parts));
  }
  if (next() < 0.5) {
    const n = int(11, 20);
    return make("frames", [10, n - 10], Array.from({ length: n }, (_, k) => ({ ...frameCell(k), g: k < 10 ? 0 : 1 })));
  }
  const parts = [int(3, 6), int(3, 6), int(3, 6)];
  return make("groups", parts, groups(parts));
}

/** How the number is seen, in LaTeX: 5 + 2, 10 − 3 for a nearly full frame, 10 + 4, 4 + 3 + 5. */
export function lookSteps(t: LookTask): string {
  if (t.kind === "frame") return t.n >= 8 ? `10 - ${10 - t.n} = ${t.n}` : t.n > 5 ? `5 + ${t.n - 5} = ${t.n}` : String(t.n);
  if (t.parts.length > 1) return `${t.parts.join(" + ")} = ${t.n}`;
  return String(t.n);
}

// ---------- the board's game ----------

export const LOOK_LADDER: { level: LookLevel; seed: number }[] = [
  { level: 1, seed: 41 },
  { level: 1, seed: 42 },
  { level: 1, seed: 43 },
  { level: 2, seed: 51 },
  { level: 2, seed: 52 },
  { level: 2, seed: 53 },
  { level: 3, seed: 61 },
  { level: 3, seed: 62 },
  { level: 3, seed: 63 },
];
/** The five flashes of a round: never the same number twice in a row. */
export function lookRound(level: LookLevel, seed: number): LookTask[] {
  const next = rng(seed);
  const out: LookTask[] = [];
  while (out.length < ROUND) {
    const t = lookTask(level, next);
    if (out.at(-1)?.n !== t.n) out.push(t);
  }
  return out;
}
/** Stars for a round: all five right three, four two, fewer one; a second look caps them at two. */
export const lookStars = (right: number, relooked: boolean) => Math.min(right >= ROUND ? 3 : right === ROUND - 1 ? 2 : 1, relooked ? 2 : 3);
/** The endless run's flash: shorter by an eighth for every right answer in the streak, down to MIN_FLASH_MS. */
export const flashFor = (level: LookLevel, streak: number) => Math.max(MIN_FLASH_MS, Math.round(FLASH_MS[level] * 0.875 ** streak));
/** The largest number a round can ask, for the buttons to answer with. */
export const padMax = (level: LookLevel) => (level === 1 ? 6 : level === 2 ? 12 : 20);

export type LookNotice = "quick" | "fullFrame" | "threeGroups" | "streak10";
export const LOOK_NOTICES: LookNotice[] = ["quick", "fullFrame", "threeGroups", "streak10"];
/** What a right answer shows: a full ten frame seen as ten, three groups added at a glance, an answer within a second, ten in a row. */
export function lookNotice(t: LookTask, right: boolean, ms: number, streak: number): LookNotice | null {
  if (!right) return null;
  if ((t.kind === "frame" && t.n === 10) || (t.kind === "frames" && t.n === 20)) return "fullFrame";
  if (t.kind === "groups" && t.parts.length === 3) return "threeGroups";
  if (streak === 10) return "streak10";
  if (ms <= 1000) return "quick";
  return null;
}

/** The game on the board: a round of the ladder or the endless run, the flash it is at and what it has shown. */
export type LiveQuickLook = {
  mode: "puzzle" | "endless";
  stage: number;
  level: LookLevel;
  seed: number;
  i: number;
  /** Right or not, for the flashes of the round answered so far. */
  results: boolean[];
  /** ready: waiting to look; look: the dots are showing; answer: hidden, waiting for a number; shown: answered. */
  phase: "ready" | "look" | "answer" | "shown";
  answer: number | null;
  relooked: boolean;
  streak: number;
  said: { kind: "notice"; key: LookNotice } | { kind: "done"; stars: number } | null;
};
export const lookNow = (d: Pick<LiveQuickLook, "mode" | "stage" | "level" | "seed" | "i">): LookTask =>
  d.mode === "puzzle" ? lookRound(LOOK_LADDER[d.stage].level, LOOK_LADDER[d.stage].seed)[d.i] : lookTask(d.level, rng(d.seed));

// ---------- pictures ----------

const GROUP_COLORS = ["#1971c2", "#e8590c", "#2f9e44"];
/** The dots (and the frames they sit in), coloured by group when `grouped`: a body of LOOK_W × LOOK_H. */
export function dotsSvg(t: LookTask, grouped = false): string {
  const frames = t.kind === "frame" ? 1 : t.kind === "frames" ? 2 : 0;
  let out = "";
  for (let f = 0; f < frames; f++)
    for (let k = 0; k < 10; k++) {
      const { x, y } = frameCell(f * 10 + k, frames as 1 | 2);
      out += `<rect x="${x - 25}" y="${y - 22}" width="50" height="44" fill="none" stroke="#868e96" stroke-width="2"/>`;
    }
  for (const d of t.dots) out += `<circle cx="${Math.round(d.x * 10) / 10}" cy="${Math.round(d.y * 10) / 10}" r="13" fill="${grouped ? GROUP_COLORS[d.g % 3] : "#1e1e1e"}"/>`;
  return out;
}
/** The height the dots take: two ten frames need more room than the box. */
export const dotsHeight = (t: LookTask) => (t.kind === "frames" ? 236 : LOOK_H);

/** The worked solution: the dots coloured by group, with how they add up beneath. */
export type DotsSolution = { task: LookTask };
export function renderDots(spec: DotsSolution, steps: { svg: string; width: number; height: number } | null) {
  const h0 = dotsHeight(spec.task);
  const w = Math.max(LOOK_W, steps?.width ?? 0);
  const h = h0 + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${h0})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - LOOK_W) / 2} 0)">${dotsSvg(spec.task, true)}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
