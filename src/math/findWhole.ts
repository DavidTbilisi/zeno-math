// Find the whole: a part is given and the whole is not. "This bar is 2/3: build one whole" means cutting the bar into
// its two thirds and laying three of them; "this bar is 4/3" means taking one off. The other way round, "this bar is 1:
// what is the piece?" is measuring, and the bar shown can be a part itself ("this is 3/4"), where the piece read
// against the bar shown instead of against one whole is the slip (the whole changed and nothing tests it).
import { Frac } from "./fraction";
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

/** Build: the piece is n/d, lay one whole from its parts. Name: a bar of rn steps of 1/rd is rn/rd (one whole when
 *  rn = rd), and the piece is pn steps: what is the piece? */
export type WholeTask = { kind: "build"; n: number; d: number } | { kind: "name"; rn: number; rd: number; pn: number };
/** The most parts the built row takes. */
export const MAX_ROW = 24;

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** Level 1: unit pieces (1/3 makes a whole of three; a whole cut in fourths names 1/4); level 2: pieces of several
 *  parts (2/3, which is cut first; 3/5 of a whole); level 3: a piece bigger than one (4/3: take one off) or a bar
 *  that is not one whole (this is 3/4: what is the piece?). */
export function wholeTask(level: GameLevel, next: () => number): WholeTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const build = next() < 0.5;
  if (level === 1) {
    const d = pick(range(2, 6));
    return build ? { kind: "build", n: 1, d } : { kind: "name", rn: d, rd: d, pn: 1 };
  }
  if (level === 2) {
    const d = pick(range(3, 6));
    const n = pick(range(2, d - 1).filter((x) => gcd(x, d) === 1));
    if (build) return { kind: "build", n, d };
    const rd = pick(range(3, 8));
    return { kind: "name", rn: rd, rd, pn: pick(range(2, rd - 1)) };
  }
  if (build) {
    const d = pick([2, 3, 4]);
    return { kind: "build", n: pick(range(d + 1, 2 * d - 1).filter((x) => gcd(x, d) === 1)), d };
  }
  const rd = pick(range(3, 6));
  const rn = pick(range(2, rd - 1).filter((x) => gcd(x, rd) === 1));
  return { kind: "name", rn, rd, pn: pick(range(1, rd).filter((x) => x !== rn)) };
}

export type WholeWhy = "notCut" | "short" | "long" | "ofShown" | "answer";
export type WholeNotice = "removed" | "finer" | "changed" | "streak10";
export const WHOLE_NOTICES: WholeNotice[] = ["removed", "finer", "changed", "streak10"];

export type LiveFindWhole = GameBase<WholeNotice, { kind: "wrong"; why: WholeWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** How many parts the given bar (the piece, or the bar named) is cut into. */
  cut: number;
  /** Build: how many of those parts are laid in the row. */
  parts: number;
  /** Name: the answer, top over bottom. */
  top: number;
  bottom: number;
  /** Free play: the piece to build from. */
  n: number;
  d: number;
  misses: number;
  done: boolean;
};

export const WHOLE_FRESH: Partial<LiveFindWhole> = { cut: 1, parts: 1, top: 0, bottom: 1, misses: 0, done: false, said: null };
export const WHOLE_START: LiveFindWhole = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, cut: 1, parts: 1, top: 0, bottom: 1, n: 2, d: 3, misses: 0, done: false };

export const WHOLE_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 611 },
  { level: 1, seed: 612 },
  { level: 1, seed: 613 },
  { level: 2, seed: 621 },
  { level: 2, seed: 622 },
  { level: 2, seed: 623 },
  { level: 3, seed: 631 },
  { level: 3, seed: 632 },
  { level: 3, seed: 633 },
];

export const wholeNow = (d: Pick<LiveFindWhole, "mode" | "stage" | "level" | "seed">): WholeTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? wholeTask(WHOLE_LADDER[d.stage].level, rng(WHOLE_LADDER[d.stage].seed))
  : wholeTask(d.level, rng(d.seed));

/** What the built row is, as a part of one whole: parts of a piece n/d cut into cut. */
export const builtOf = (n: number, d: number, cut: number, parts: number) => new Frac(parts * n, cut * d);

/** What is wrong with a check, or null when right. */
export function judgeWhole(t: WholeTask, d: Pick<LiveFindWhole, "cut" | "parts" | "top" | "bottom">): WholeWhy | null {
  if (t.kind === "build") {
    const built = builtOf(t.n, t.d, d.cut, d.parts);
    if (built.sub(Frac.ONE).isZero()) return null;
    // The piece counted as one part: d copies of it.
    if (d.cut === 1 && t.n > 1 && d.parts === t.d) return "notCut";
    return built.toNumber() < 1 ? "short" : "long";
  }
  const got = d.bottom > 0 ? new Frac(d.top, d.bottom) : null;
  if (got && got.sub(new Frac(t.pn, t.rd)).isZero()) return null;
  return got && t.rn !== t.rd && got.sub(new Frac(t.pn, t.rn)).isZero() ? "ofShown" : "answer";
}

export const wholeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: parts taken off a piece over one, a whole of smaller parts than needed, a bar that was
 *  not one whole kept track of. */
export function wholeNotice(t: WholeTask, d: Pick<LiveFindWhole, "cut">, streak: number): WholeNotice | null {
  if (streak === 10) return "streak10";
  if (t.kind === "name") return t.rn !== t.rd ? "changed" : null;
  if (d.cut > t.n) return "finer";
  return t.n > t.d ? "removed" : null;
}
