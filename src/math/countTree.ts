// The counting principle as a tree of outfits (#738). In the first two rounds the learner grows the tree: a tap on a
// shirt brings out every pair of trousers with it, a tap on a pair of trousers every hat, until every outfit is made
// and counted. In the last two the tree is not drawn: the learner says how many outfits there are, and adding the
// choices or leaving a stage out is named. Only then is the rule said: multiply the numbers of choices.
// src/live/CountTree.tsx draws it.

export type CountRound = { stages: readonly number[]; mode: "build" | "predict"; options?: readonly number[] };

/** Shirts, then trousers, then hats; each stage's count of choices. */
export const COUNT_ROUNDS: readonly CountRound[] = [
  { stages: [3, 2], mode: "build" },
  { stages: [2, 2, 2], mode: "build" },
  { stages: [4, 3], mode: "predict", options: [7, 12, 16] },
  { stages: [3, 2, 4], mode: "predict", options: [9, 12, 24] },
];

export type LiveCountTree = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The branches opened so far, each a path of choices such as "0" or "1.0". */
  open: string[];
  /** The count picked in a predict round, or null. */
  pick: number | null;
};

export const COUNT_TREE_START: LiveCountTree = { round: 0, open: [], pick: null };

export const roundOf = (s: LiveCountTree) => COUNT_ROUNDS[s.round] ?? null;
export const total = (stages: readonly number[]) => stages.reduce((a, b) => a * b, 1);

const parse = (p: string) => (p === "" ? [] : p.split(".").map(Number));

/** Whether a node shows: the first stage always, a later one once the branch before it is opened. */
export function shown(s: LiveCountTree, path: string): boolean {
  const ps = parse(path);
  return ps.length <= 1 || s.open.includes(ps.slice(0, -1).join("."));
}

/** The outfits made: the last stage's nodes that show. */
export function made(s: LiveCountTree): number {
  const r = roundOf(s);
  if (!r || r.mode !== "build") return 0;
  const n = r.stages.length;
  return s.open.filter((p) => parse(p).length === n - 1).length * r.stages[n - 1];
}

/** A build round is done with every outfit made; a predict round with the right count picked. */
export function done(s: LiveCountTree): boolean {
  const r = roundOf(s);
  if (!r) return false;
  return r.mode === "build" ? made(s) === total(r.stages) : s.pick === total(r.stages);
}

/** A branch opened (a node that shows and is not the last stage); nothing changes once the round is done. */
export function openAt(s: LiveCountTree, path: string): LiveCountTree {
  const r = roundOf(s);
  if (!r || r.mode !== "build" || done(s) || !shown(s, path) || s.open.includes(path)) return s;
  if (parse(path).length >= r.stages.length) return s;
  return { ...s, open: [...s.open, path] };
}

/** A count picked in a predict round. */
export function pickCount(s: LiveCountTree, v: number): LiveCountTree {
  const r = roundOf(s);
  if (!r || r.mode !== "predict" || done(s)) return s;
  return { ...s, pick: v };
}

/** Why a picked count is wrong: the choices added, or one stage left out, or neither. */
export function missOf(r: CountRound, v: number): "added" | "dropped" | "other" | null {
  if (v === total(r.stages)) return null;
  if (v === r.stages.reduce((a, b) => a + b, 0)) return "added";
  if (r.stages.some((_, i) => total(r.stages.filter((__, j) => j !== i)) === v)) return "dropped";
  return "other";
}

export const next = (s: LiveCountTree): LiveCountTree => ({ round: Math.min(COUNT_ROUNDS.length, s.round + 1), open: [], pick: null });
export const again = (): LiveCountTree => COUNT_TREE_START;

/** Every path of the full tree to depth d (1 = the first stage), in order. */
export function pathsTo(stages: readonly number[], d: number): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < d; i++) out = out.flatMap((p) => Array.from({ length: stages[i] }, (_, k) => [...p, k]));
  return out;
}

/** Where a node sits among the leaves: the middle of the leaves under it, counted from 0. */
export function slot(stages: readonly number[], p: readonly number[]): number {
  let first = 0;
  for (let i = 0; i < p.length; i++) first += p[i] * total(stages.slice(i + 1));
  return first + (total(stages.slice(p.length)) - 1) / 2;
}
