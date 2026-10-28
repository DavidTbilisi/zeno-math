// Name the pattern: the player reads a problem and drags it onto the pattern that solves it, one of the twelve the
// algorithm-sense games play (sort, graph search, DP, binary search, two pointers, sliding window, backtracking, heap,
// search tree, monotonic stack, union-find, topological sort). Each problem has a clue, the phrase that gives the
// pattern away; a right answer lights it, and a wrong one says what the chosen pattern needs, so the player can check
// the problem against it. Thirty-six problems, three for each pattern, with their numbers drawn fresh. Kept free of
// React and of words: the board keeps only the answers made so far, and the problems' and patterns' words are the
// locale's.
import type { EndlessGame, TryGame } from "./ladder";
import type { LiveKind } from "./live";
import { rng } from "./random";

export const PATTERNS = ["sort", "search", "dp", "binary", "pointers", "window", "backtrack", "heap", "tree", "stack", "union", "topo"] as const;
export type Pattern = (typeof PATTERNS)[number];
/** The game each pattern is played in, for its icon on the tile. */
export const ICONS: Record<Pattern, string> = {
  sort: "🔀", search: "🔦", dp: "▦", binary: "🔍", pointers: "👉", window: "🪟", backtrack: "♛", heap: "⛰️", tree: "🌳", stack: "📚", union: "🔗", topo: "➡️",
};
/** The game each pattern is played in, opened beside the board's piece to play a problem by hand. */
export const GAMES: Record<Pattern, LiveKind> = {
  sort: "beSort", search: "beSearch", dp: "beDp", binary: "beBinary", pointers: "bePointers", window: "beWindow", backtrack: "beBacktrack",
  heap: "beHeap", tree: "beTree", stack: "beStack", union: "beUnion", topo: "beTopo",
};
/** The first puzzle of its pattern's game that plays each problem (merging two piles is merge sort's, the quickest trip Dijkstra's…). */
export const PLAY: Record<string, number> = {
  s1: 0, s2: 0, s3: 6,
  q1: 0, q2: 2, q3: 0,
  d1: 0, d2: 1, d3: 3,
  b1: 0, b2: 2, b3: 0,
  p1: 0, p2: 3, p3: 2,
  w1: 0, w2: 2, w3: 1,
  k1: 3, k2: 8, k3: 2,
  h1: 3, h2: 1, h3: 1,
  t1: 0, t2: 0, t3: 2,
  m1: 1, m2: 0, m3: 3,
  u1: 1, u2: 0, u3: 2,
  o1: 0, o2: 2, o3: 1,
};
/** The problems, by id: the first letter names nothing; each lists its pattern. Their words are live.beName.problems[id]. */
export const PROBLEMS: Record<string, Pattern> = {
  s1: "sort", s2: "sort", s3: "sort",
  q1: "search", q2: "search", q3: "search",
  d1: "dp", d2: "dp", d3: "dp",
  b1: "binary", b2: "binary", b3: "binary",
  p1: "pointers", p2: "pointers", p3: "pointers",
  w1: "window", w2: "window", w3: "window",
  k1: "backtrack", k2: "backtrack", k3: "backtrack",
  h1: "heap", h2: "heap", h3: "heap",
  t1: "tree", t2: "tree", t3: "tree",
  m1: "stack", m2: "stack", m3: "stack",
  u1: "union", u2: "union", u3: "union",
  o1: "topo", o2: "topo", o3: "topo",
};
export const PROBLEM_IDS = Object.keys(PROBLEMS);
/** Problems that share a word with another pattern's (a sorted list, a graph), so look alike. */
export const LOOKALIKE: Record<string, readonly string[]> = { sorted: ["b1", "p1", "p3", "s3"], graph: ["q1", "q3", "u1", "u2", "o1", "o2"] };

export type NameLevel = 1 | 2 | 3;
/** A problem with its numbers. */
export type NameItem = { id: string; n: number; x: number; k: number };
export type NameTask = { items: NameItem[] };
export type NameNotice = "sorted" | "graph" | "streak10";
export const NAME_NOTICES: NameNotice[] = ["sorted", "graph", "streak10"];

/** The board keeps the tiles answered right, in turn; the machine is what they show. */
export type NameMachine = { task: NameTask; k: number; answered: Pattern[]; seen: NameNotice[] };

export function startMachine(task: NameTask): NameMachine {
  return { task, k: 0, answered: [], seen: [] };
}
/** The pattern the problem being asked is solved by, or null when all are answered. */
export const expect = (m: NameMachine): Pattern | null => (m.k < m.task.items.length ? PROBLEMS[m.task.items[m.k].id] : null);

/** The machine after one more right answer, by its tile (an index of PATTERNS). */
export function apply(m0: NameMachine, code: number): NameMachine {
  const m: NameMachine = { ...m0, answered: [...m0.answered, PATTERNS[code]], k: m0.k + 1, seen: [...m0.seen] };
  if (m.k === m.task.items.length) {
    const ids = m.task.items.map((i) => i.id);
    const see = (k: NameNotice) => m.seen.includes(k) || m.seen.push(k);
    if (ids.some((id) => LOOKALIKE.sorted.includes(id) && PROBLEMS[id] !== "binary") && ids.includes("b1")) see("sorted");
    if (ids.filter((id) => LOOKALIKE.graph.includes(id)).map((id) => PROBLEMS[id]).filter((p, i, a) => a.indexOf(p) === i).length >= 2) see("graph");
  }
  return m;
}
export function nameRun(task: NameTask): { ops: number[]; end: NameMachine } {
  const ops = task.items.map((i) => PATTERNS.indexOf(PROBLEMS[i.id]));
  return { ops, end: ops.reduce(apply, startMachine(task)) };
}
export const replay = (task: NameTask, ops: number[]) => ops.reduce(apply, startMachine(task));

export type NameWhy = "notThis";
export type NameCheck = { ok: true; code: number } | { ok: false; why: NameWhy; vars: { tile: Pattern } };
/** Whether the tile is the pattern that solves the problem; if not, which tile was chosen (its needs say why not). */
export function checkOp(m: NameMachine, tile: number): NameCheck {
  return PATTERNS[tile] === expect(m) ? { ok: true, code: tile } : { ok: false, why: "notThis", vars: { tile: PATTERNS[tile] } };
}

// ---------- the tasks ----------

type Spec = { size: number; from: readonly Pattern[]; looks?: boolean };
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
/** xs in a random order. */
const shuffled = <T>(xs: readonly T[], next: () => number): T[] => xs.map((x) => [next(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/**
 * A round: `size` problems from different patterns among `from`, each with fresh numbers; `looks` puts in a pair that
 * look alike (two sorted-list problems, or two graph problems of different patterns).
 */
export function nameTask(spec: Spec, next: () => number): NameTask {
  for (;;) {
    const pats = shuffled(spec.from, next).slice(0, spec.size);
    const ids = pats.map((p) => shuffled(PROBLEM_IDS.filter((id) => PROBLEMS[id] === p), next)[0]);
    if (spec.looks) {
      const pairs = Object.values(LOOKALIKE).filter((g) => g.filter((id) => ids.includes(id)).map((id) => PROBLEMS[id]).filter((p, i, a) => a.indexOf(p) === i).length >= 2);
      if (!pairs.length) continue;
    }
    return { items: ids.map((id) => ({ id, n: int(5, 12, next), x: int(10, 99, next), k: int(2, 5, next) })) };
  }
}

const HALF_A: readonly Pattern[] = ["sort", "search", "dp", "binary", "pointers", "window"];
const HALF_B: readonly Pattern[] = ["backtrack", "heap", "tree", "stack", "union", "topo"];
export const NAME_LADDER: (Spec & { seed: number })[] = [
  { size: 6, from: HALF_A, seed: 3301 },
  { size: 6, from: HALF_B, seed: 3302 },
  { size: 6, from: PATTERNS, seed: 3303 },
  { size: 6, from: HALF_A, looks: true, seed: 3304 },
  { size: 6, from: HALF_B, looks: true, seed: 3305 },
  { size: 8, from: PATTERNS, seed: 3306 },
  { size: 8, from: PATTERNS, looks: true, seed: 3307 },
  { size: 10, from: PATTERNS, looks: true, seed: 3308 },
  { size: 12, from: PATTERNS, seed: 3309 },
];
/** The endless run: easy, four of the first six patterns; medium, six of all twelve; hard, eight with look-alikes. */
export function levelSpec(level: NameLevel): Spec {
  if (level === 1) return { size: 4, from: HALF_A };
  return level === 2 ? { size: 6, from: PATTERNS } : { size: 8, from: PATTERNS, looks: true };
}

export const nameStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a round answered without a miss showed, the first of them; ten in a row in the endless run. */
export function nameNotice(m: NameMachine, misses: number, streak: number): NameNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (NAME_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeName = EndlessGame<NameNotice, NameLevel, { kind: "wrong"; why: NameWhy; vars: { tile: Pattern } }> &
  TryGame & {
    /** The tiles answered right so far, by their index in PATTERNS. */
    ops: number[];
  };
export function nameNow(d: Pick<LiveBeName, "mode" | "stage" | "level" | "seed">): NameTask {
  if (d.mode === "puzzle") {
    const s = NAME_LADDER[d.stage];
    return nameTask(s, rng(s.seed));
  }
  return nameTask(levelSpec(d.level), rng(d.seed));
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the problem's card, or a pattern's tile. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type NamePic = { w: number; h: number; body: string; spots: Spot[] };

const ORANGE = "#f08c00";
const GREEN = "#2f9e44";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const W = 640;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

/** The words broken into lines of at most `max` characters. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return line ? [...lines, line] : lines;
}

/**
 * The round drawn: the problem's card (its text wrapped, the clue lit green once answered), how far the round is, and
 * the twelve tiles, each its game's icon and name. `text` is the problem's words, `clue` the clue's (shown when
 * `showClue`), `names` the tiles' names. `hot` lights the tile a drag is over and `sel` the card picked up.
 */
export function nameSvg(m: NameMachine, words: { text: string; clue: string; names: string[]; showClue: boolean }, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): NamePic {
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const live = !o.finished && expect(m) !== null;
  const lines = wrap(words.text, 62);
  const ch = 24 + lines.length * 22;
  parts.push(tx(16, 22, `${Math.min(m.k + 1, m.task.items.length)} / ${m.task.items.length}`, { size: 13, anchor: "start", color: MUTED }));
  const cardFill = lit("card") === "hot" ? "#fff3bf" : lit("card") ? "#ffe8cc" : live ? "#fff4e6" : "#ebfbee";
  parts.push(`<rect x="16" y="32" width="${W - 32}" height="${ch}" rx="10" fill="${cardFill}" stroke="${live ? ORANGE : GREEN}" stroke-width="2"/>`);
  lines.forEach((l, i) => parts.push(tx(32, 56 + i * 22, l, { size: 15, anchor: "start" })));
  if (words.showClue && words.clue) parts.push(tx(32, 32 + ch + 22, `“${words.clue}”`, { size: 14, anchor: "start", bold: true, color: GREEN }));
  if (live) spots.push({ id: "card", x: 16, y: 32, w: W - 32, h: ch, from: true, to: false, label: "problem" });
  const ty = 32 + ch + 40;
  const [tw, th, gap] = [146, 62, 8];
  PATTERNS.forEach((p, i) => {
    const [x, y] = [16 + (i % 4) * (tw + gap), ty + Math.floor(i / 4) * (th + gap)];
    const id = `tile${i}`;
    const done = m.answered.includes(p);
    const l = lit(id);
    parts.push(`<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="${l === "hot" ? "#fff3bf" : done ? "#ebfbee" : "#f8f9fa"}" stroke="${l ? ORANGE : done ? GREEN : "#ced4da"}" stroke-width="${l ? 2.4 : 1.6}"/>`);
    parts.push(tx(x + 22, y + 38, ICONS[p], { size: 20 }));
    // A name may break after a hyphen too (union-find in Georgian is one long word).
    wrap(words.names[i].replace(/-/g, "- "), 14).map((l) => l.replace(/- /g, "-")).forEach((s, k, a) => parts.push(tx(x + 42, y + 36 + (k - (a.length - 1) / 2) * 16, s, { size: 13, anchor: "start", bold: true })));
    spots.push({ id, x, y, w: tw, h: th, from: false, to: live, label: words.names[i] });
  });
  return { w: W, h: ty + 3 * (th + gap) + 8, body: parts.join(""), spots };
}
