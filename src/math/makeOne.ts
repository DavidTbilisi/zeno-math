// Make one: fraction pieces, each a slice of a pie, fall down the stage; tap one to catch it into the basket, a pie of
// one whole that fills as pieces go in. When the basket holds exactly one whole it is a one made, and it empties for
// the next; past one it spills, red, and that is the slip. A wave is a fixed run of pieces from a seed: a few groups that
// make one each (1/2 + 1/4 + 1/4, 1/3 + 1/6 + 1/2), in turn, with pieces that belong to none dropped among them. The
// nine puzzles go from halves and quarters one at a time and slowly to six families of parts, two at a time and fast.
// The fall of a piece, the catch and the basket are worked out here; the board's piece only draws them.
import { Frac } from "./fraction";
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";

/** The stage in SVG units, a piece's radius, and where the pieces are lost (the top of the basket's row). */
export const MAKE_W = 600;
export const MAKE_H = 400;
export const PIECE_R = 30;
export const FLOOR = MAKE_H - 92;
/** The first piece leaves a moment after the wave starts. */
const LEAD = 600;

/** A wave: pieces with these bottoms; `goal` groups that make one, each of `parts` pieces; `decoys` more; dropped
 *  `volley` at a time every `gap` ms, each falling for `fall` ms. */
export type MakeSpec = { dens: number[]; parts: [number, number]; goal: number; decoys: number; volley: 1 | 2; gap: number; fall: number };
/** A piece dropped: its fraction, when, where across, and its group (-1 for none). */
export type Drop = { f: Frac; at: number; x: number; group: number };

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
/** Every proper fraction in lowest terms with one of these bottoms. */
export const piecesOf = (dens: number[]) => {
  const out: Frac[] = [];
  for (const d of dens) for (let n = 1; n < d; n++) if (gcd(n, d) === 1 && !out.some((f) => f.n === n && f.d === d)) out.push(new Frac(n, d));
  return out;
};
/** Every way to make one from k of the pieces, k in the range, smallest first within a way. */
export function waysToOne(dens: number[], [lo, hi]: [number, number]): Frac[][] {
  const fs = piecesOf(dens).sort((a, b) => a.toNumber() - b.toNumber());
  const out: Frac[][] = [];
  const go = (from: number, sum: Frac, picked: Frac[]) => {
    if (picked.length >= lo && sum.isOne()) out.push(picked);
    if (picked.length === hi) return;
    for (let i = from; i < fs.length; i++) {
      const s = sum.add(fs[i]);
      if (s.toNumber() > 1 + 1e-9) break;
      go(i, s, [...picked, fs[i]]);
    }
  };
  go(0, Frac.ZERO, []);
  return out;
}

export function makeWave(spec: MakeSpec, next: () => number): Drop[] {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const ways = waysToOne(spec.dens, spec.parts);
  const all = piecesOf(spec.dens);
  // The groups in turn, each shuffled; a decoy goes in at a random place.
  const fs: { f: Frac; group: number }[] = [];
  for (let g = 0; g < spec.goal; g++) {
    const way = [...pick(ways)];
    for (let i = way.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [way[i], way[j]] = [way[j], way[i]];
    }
    fs.push(...way.map((f) => ({ f, group: g })));
  }
  for (let k = 0; k < spec.decoys; k++) fs.splice(Math.floor(next() * (fs.length + 1)), 0, { f: pick(all), group: -1 });
  const lane = (MAKE_W - 2 * PIECE_R - 40) / spec.volley;
  return fs.map(({ f, group }, i) => ({
    f,
    group,
    at: LEAD + Math.floor(i / spec.volley) * spec.gap,
    x: PIECE_R + 20 + (i % spec.volley) * lane + next() * (lane - 2 * PIECE_R) + PIECE_R,
  }));
}

/** Where a piece is t ms into the wave: straight down from above the stage to the floor in `fall` ms, swaying a little. */
export function posAt(d: Drop, fall: number, t: number): [number, number] {
  const s = (t - d.at) / fall;
  return [d.x + 12 * Math.sin((t - d.at) / 400 + d.x), -PIECE_R + s * (FLOOR + PIECE_R)];
}

export type PieceEnd = { kind: "caught" | "fell"; t: number; at: [number, number] };
export type Piece = { i: number; end: PieceEnd | null };
export type Sim = { t: number; dropped: number; pieces: Piece[]; basket: Frac[]; made: number; overs: number };
export const startSim = (): Sim => ({ t: 0, dropped: 0, pieces: [], basket: [], made: 0, overs: 0 });
/** How long what has ended stays on the stage, to be seen going. */
export const FADE = 600;

export type MakeEvent = { kind: "in"; f: Frac; sum: Frac } | { kind: "one"; parts: Frac[] } | { kind: "over"; parts: Frac[]; sum: Frac };
export const sumOf = (fs: Frac[]) => fs.reduce((s, f) => s.add(f), Frac.ZERO);

/** Moves the wave on to time t: drops the pieces due, and loses those that reach the floor. */
export function advance(sim: Sim, drops: Drop[], fall: number, t: number): Sim {
  let dropped = sim.dropped;
  const pieces = [...sim.pieces];
  for (; dropped < drops.length && drops[dropped].at <= t; dropped++) pieces.push({ i: dropped, end: null });
  const kept = pieces
    .map((p): Piece => (p.end || t - drops[p.i].at < fall ? p : { ...p, end: { kind: "fell", t, at: posAt(drops[p.i], fall, t) } }))
    .filter((p) => !p.end || t - p.end.t < FADE);
  return { ...sim, t, dropped, pieces: kept };
}

/** A tap at (x, y): the lowest piece under it goes into the basket; one whole is a one made, more spills. */
export function catchAt(sim: Sim, drops: Drop[], fall: number, x: number, y: number): { sim: Sim; event: MakeEvent | null } {
  const hit = sim.pieces
    .filter((p) => !p.end)
    .map((p) => ({ p, at: posAt(drops[p.i], fall, sim.t) }))
    .filter(({ at }) => Math.hypot(at[0] - x, at[1] - y) <= PIECE_R + 6)
    .sort((a, b) => b.at[1] - a.at[1])[0];
  if (!hit) return { sim, event: null };
  const f = drops[hit.p.i].f;
  const pieces = sim.pieces.map((p) => (p === hit.p ? { ...p, end: { kind: "caught" as const, t: sim.t, at: hit.at } } : p));
  const parts = [...sim.basket, f];
  const sum = sumOf(parts);
  if (sum.isOne()) return { sim: { ...sim, pieces, basket: [], made: sim.made + 1 }, event: { kind: "one", parts } };
  if (sum.toNumber() > 1) return { sim: { ...sim, pieces, basket: [], overs: sim.overs + 1 }, event: { kind: "over", parts, sum } };
  return { sim: { ...sim, pieces, basket: parts }, event: { kind: "in", f, sum } };
}

/** Every piece has been dropped and none is still falling. */
export const waveOver = (sim: Sim, drops: Drop[]) => sim.dropped >= drops.length && sim.pieces.every((p) => p.end);

/** Slips: every spill, and every one short of the goal. */
export const slipsOf = (made: number, overs: number, goal: number) => overs + Math.max(0, goal - made);
export const makeStars = (slips: number) => (slips === 0 ? 3 : slips === 1 ? 2 : 1);
/** A sum written out: "1/2 + 1/4 + 1/4". */
export const sumText = (fs: Frac[]) => fs.map((f) => `${f.n}/${f.d}`).join(" + ");

// ---------- the board's game ----------

export const MAKE_LADDER: { spec: MakeSpec; seed: number }[] = [
  { spec: { dens: [2, 4], parts: [2, 3], goal: 2, decoys: 2, volley: 1, gap: 1500, fall: 4400 }, seed: 4001 },
  { spec: { dens: [3, 6], parts: [2, 3], goal: 2, decoys: 3, volley: 1, gap: 1400, fall: 4200 }, seed: 4002 },
  { spec: { dens: [2, 4, 8], parts: [2, 3], goal: 3, decoys: 3, volley: 1, gap: 1300, fall: 4000 }, seed: 4003 },
  { spec: { dens: [2, 3, 6], parts: [2, 3], goal: 3, decoys: 3, volley: 1, gap: 1250, fall: 3800 }, seed: 4004 },
  { spec: { dens: [2, 4, 8], parts: [2, 4], goal: 3, decoys: 4, volley: 2, gap: 1700, fall: 3800 }, seed: 4005 },
  { spec: { dens: [3, 6, 12], parts: [2, 3], goal: 3, decoys: 4, volley: 2, gap: 1600, fall: 3600 }, seed: 4006 },
  { spec: { dens: [2, 5, 10], parts: [2, 3], goal: 3, decoys: 4, volley: 2, gap: 1500, fall: 3400 }, seed: 4007 },
  { spec: { dens: [2, 3, 4, 6, 12], parts: [2, 4], goal: 4, decoys: 5, volley: 2, gap: 1450, fall: 3200 }, seed: 4008 },
  { spec: { dens: [2, 3, 4, 6, 8, 12], parts: [2, 4], goal: 4, decoys: 6, volley: 2, gap: 1400, fall: 3000 }, seed: 4009 },
];
export const MAKE_LEVELS: Record<GameLevel, MakeSpec> = {
  1: { dens: [2, 4, 8], parts: [2, 3], goal: 3, decoys: 3, volley: 1, gap: 1300, fall: 4000 },
  2: { dens: [2, 3, 6, 12], parts: [2, 3], goal: 3, decoys: 4, volley: 2, gap: 1600, fall: 3600 },
  3: { dens: [2, 3, 4, 6, 8, 12], parts: [2, 4], goal: 3, decoys: 5, volley: 2, gap: 1400, fall: 3000 },
};
/** Against the clock the pieces come and fall a fifth faster. */
const quicker = (s: MakeSpec): MakeSpec => ({ ...s, gap: Math.round(s.gap * 0.8), fall: Math.round(s.fall * 0.8) });

export type MakeNotice = "three" | "mixed" | "streak10";
export const MAKE_NOTICES: MakeNotice[] = ["three", "mixed", "streak10"];
/** What a one shows: made of pieces with different bottoms (1/2 + 1/3 + 1/6), or of three pieces or more. */
export function oneNotice(parts: Frac[]): MakeNotice | null {
  if (new Set(parts.map((f) => f.d)).size > 1 && parts.length > 2) return "mixed";
  return parts.length >= 3 ? "three" : null;
}

export type LiveMakeOne = EndlessGame<MakeNotice, GameLevel, { kind: "one" | "over"; parts: string; sum?: string } | { kind: "in"; sum: string }> & {
  done: boolean;
  made: number;
  overs: number;
  /** Once the wave is over, the ones made and the spills, written out. */
  ones?: string[];
  spills?: string[];
};
export const MAKE_START: LiveMakeOne = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, done: false, made: 0, overs: 0, ones: [], spills: [] };

/** The wave of a puzzle or of the endless run. */
export function makeNow(d: Pick<LiveMakeOne, "mode" | "stage" | "level" | "seed" | "timed">): { spec: MakeSpec; drops: Drop[] } {
  const { spec: base, seed } = d.mode === "puzzle" ? MAKE_LADDER[d.stage] : { spec: MAKE_LEVELS[d.level], seed: d.seed };
  const spec = d.mode === "endless" && d.timed ? quicker(base) : base;
  return { spec, drops: makeWave(spec, rng(seed)) };
}
