// Name the component: the player reads a requirement and drags it onto the building block of a system that meets it,
// one of twelve (cache, CDN, load balancer, message queue, read replicas, sharding, database index, rate limiter,
// consistent hashing, search engine, object storage, WebSocket). Each requirement has a clue, the phrase that gives
// the component away; a right answer lights it, and a wrong one says what the chosen component is for, so the player
// can check the requirement against it. Thirty-six requirements, three for each component, with their numbers drawn
// fresh. Kept free of React and of words: the board keeps only the answers made so far, and the requirements' and
// components' words are the locale's.
import type { EndlessGame, TryGame } from "./ladder";
import type { LiveKind } from "./live";
import { rng } from "./random";

export const COMPONENTS = ["cache", "cdn", "lb", "queue", "replica", "shard", "index", "limiter", "ring", "search", "blob", "socket"] as const;
export type Comp = (typeof COMPONENTS)[number];
/** Each component's icon on its tile (the system-design game's, where it has one). */
export const ICONS: Record<Comp, string> = {
  cache: "🗄️", cdn: "🌍", lb: "⚖️", queue: "📨", replica: "🗃️", shard: "🧩", index: "📇", limiter: "🚦", ring: "⭕", search: "🔎", blob: "📦", socket: "🔌",
};
/** The game a component is played in, opened beside the board's piece to try the requirement by hand. */
export const GAMES: Partial<Record<Comp, LiveKind>> = { cache: "beCache", lb: "beBalance", queue: "beQueue", replica: "beQuorum", limiter: "beLimit", ring: "beRing" };
/** The puzzle of its component's game each requirement opens at (a server dying at round robin with one down, a burst at the token bucket…). */
export const PLAY: Record<string, number> = {
  c1: 0, c2: 0, c3: 0, l1: 0, l2: 4, l3: 4, q1: 1, q2: 1, q3: 1, r1: 0, r2: 3, r3: 0, m1: 0, m2: 1, m3: 2, g1: 2, g2: 2, g3: 0,
};
/** The requirements, by id: the first letter names nothing; each lists its component. Their words are live.beComp.problems[id]. */
export const REQS: Record<string, Comp> = {
  c1: "cache", c2: "cache", c3: "cache",
  d1: "cdn", d2: "cdn", d3: "cdn",
  l1: "lb", l2: "lb", l3: "lb",
  q1: "queue", q2: "queue", q3: "queue",
  r1: "replica", r2: "replica", r3: "replica",
  s1: "shard", s2: "shard", s3: "shard",
  i1: "index", i2: "index", i3: "index",
  m1: "limiter", m2: "limiter", m3: "limiter",
  g1: "ring", g2: "ring", g3: "ring",
  e1: "search", e2: "search", e3: "search",
  b1: "blob", b2: "blob", b3: "blob",
  w1: "socket", w2: "socket", w3: "socket",
};
export const REQ_IDS = Object.keys(REQS);
/** Requirements that look alike: faster reads (a cache, a CDN, an index), more machines (a balancer, replicas, shards), and finding (an index, a search engine). */
export const LOOKALIKE: Record<string, readonly string[]> = { faster: ["c1", "c2", "d3", "i1", "i2"], scale: ["l1", "r1", "s1", "s2"], finding: ["i1", "i2", "e1", "e3"] };

export type CompLevel = 1 | 2 | 3;
/** A requirement with its numbers. */
export type CompItem = { id: string; n: number; x: number; k: number };
export type CompTask = { items: CompItem[] };
export type CompNotice = "faster" | "scale" | "finding" | "streak10";
export const COMP_NOTICES: CompNotice[] = ["faster", "scale", "finding", "streak10"];

/** The board keeps the tiles answered right, in turn; the machine is what they show. */
export type CompMachine = { task: CompTask; k: number; answered: Comp[]; seen: CompNotice[] };

export function startMachine(task: CompTask): CompMachine {
  return { task, k: 0, answered: [], seen: [] };
}
/** The component the requirement being asked is met by, or null when all are answered. */
export const expect = (m: CompMachine): Comp | null => (m.k < m.task.items.length ? REQS[m.task.items[m.k].id] : null);

/** The machine after one more right answer, by its tile (an index of COMPONENTS). */
export function apply(m0: CompMachine, code: number): CompMachine {
  const m: CompMachine = { ...m0, answered: [...m0.answered, COMPONENTS[code]], k: m0.k + 1, seen: [...m0.seen] };
  if (m.k === m.task.items.length) {
    const ids = m.task.items.map((i) => i.id);
    const see = (k: CompNotice) => m.seen.includes(k) || m.seen.push(k);
    // Two look-alikes of different components in one round, both named right.
    const apart = (g: readonly string[]) => ids.filter((id) => g.includes(id)).map((id) => REQS[id]).filter((p, i, a) => a.indexOf(p) === i).length >= 2;
    if (apart(LOOKALIKE.faster)) see("faster");
    if (apart(LOOKALIKE.scale)) see("scale");
    if (apart(LOOKALIKE.finding)) see("finding");
  }
  return m;
}
export function compRun(task: CompTask): { ops: number[]; end: CompMachine } {
  const ops = task.items.map((i) => COMPONENTS.indexOf(REQS[i.id]));
  return { ops, end: ops.reduce(apply, startMachine(task)) };
}
export const replay = (task: CompTask, ops: number[]) => ops.reduce(apply, startMachine(task));

export type CompWhy = "notThis";
export type CompCheck = { ok: true; code: number } | { ok: false; why: CompWhy; vars: { tile: Comp } };
/** Whether the tile is the component that meets the requirement; if not, which tile was chosen (its needs say why not). */
export function checkOp(m: CompMachine, tile: number): CompCheck {
  return COMPONENTS[tile] === expect(m) ? { ok: true, code: tile } : { ok: false, why: "notThis", vars: { tile: COMPONENTS[tile] } };
}

// ---------- the tasks ----------

type Spec = { size: number; from: readonly Comp[]; looks?: boolean };
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
/** xs in a random order. */
const shuffled = <T>(xs: readonly T[], next: () => number): T[] => xs.map((x) => [next(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/**
 * A round: `size` requirements of different components among `from`, each with fresh numbers; `looks` puts in a pair
 * that look alike (two that want faster reads, more machines, or finding things, of different components).
 */
export function compTask(spec: Spec, next: () => number): CompTask {
  for (;;) {
    const pats = shuffled(spec.from, next).slice(0, spec.size);
    const ids = pats.map((p) => shuffled(REQ_IDS.filter((id) => REQS[id] === p), next)[0]);
    if (spec.looks) {
      const pairs = Object.values(LOOKALIKE).filter((g) => g.filter((id) => ids.includes(id)).map((id) => REQS[id]).filter((p, i, a) => a.indexOf(p) === i).length >= 2);
      if (!pairs.length) continue;
    }
    return { items: ids.map((id) => ({ id, n: int(5, 12, next), x: int(10, 99, next), k: int(2, 5, next) })) };
  }
}

const HALF_A: readonly Comp[] = ["cache", "cdn", "lb", "queue", "replica", "shard"];
const HALF_B: readonly Comp[] = ["index", "limiter", "ring", "search", "blob", "socket"];
export const COMP_LADDER: (Spec & { seed: number })[] = [
  { size: 6, from: HALF_A, seed: 4001 },
  { size: 6, from: HALF_B, seed: 4002 },
  { size: 6, from: COMPONENTS, seed: 4003 },
  { size: 6, from: HALF_A, looks: true, seed: 4004 },
  { size: 6, from: HALF_B, looks: true, seed: 4005 },
  { size: 8, from: COMPONENTS, seed: 4006 },
  { size: 8, from: COMPONENTS, looks: true, seed: 4007 },
  { size: 10, from: COMPONENTS, looks: true, seed: 4008 },
  { size: 12, from: COMPONENTS, seed: 4009 },
];
/** The endless run: easy, four of the first six components; medium, six of all twelve; hard, eight with look-alikes. */
export function levelSpec(level: CompLevel): Spec {
  if (level === 1) return { size: 4, from: HALF_A };
  return level === 2 ? { size: 6, from: COMPONENTS } : { size: 8, from: COMPONENTS, looks: true };
}

export const compStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a round answered without a miss showed, the first of them; ten in a row in the endless run. */
export function compNotice(m: CompMachine, misses: number, streak: number): CompNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (COMP_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeComp = EndlessGame<CompNotice, CompLevel, { kind: "wrong"; why: CompWhy; vars: { tile: Comp } }> &
  TryGame & {
    /** The tiles answered right so far, by their index in COMPONENTS. */
    ops: number[];
  };
export function compNow(d: Pick<LiveBeComp, "mode" | "stage" | "level" | "seed">): CompTask {
  if (d.mode === "puzzle") {
    const s = COMP_LADDER[d.stage];
    return compTask(s, rng(s.seed));
  }
  return compTask(levelSpec(d.level), rng(d.seed));
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the requirement's card, or a component's tile. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type CompPic = { w: number; h: number; body: string; spots: Spot[] };

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
 * The round drawn: the requirement's card (its text wrapped, the clue lit green once answered), how far the round is,
 * and the twelve tiles, each its icon and name. `text` is the requirement's words, `clue` the clue's (shown when
 * `showClue`), `names` the tiles' names. `hot` lights the tile a drag is over and `sel` the card picked up.
 */
export function compSvg(m: CompMachine, words: { text: string; clue: string; names: string[]; showClue: boolean }, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): CompPic {
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
  if (live) spots.push({ id: "card", x: 16, y: 32, w: W - 32, h: ch, from: true, to: false, label: "requirement" });
  const ty = 32 + ch + 40;
  const [tw, th, gap] = [146, 62, 8];
  COMPONENTS.forEach((p, i) => {
    const [x, y] = [16 + (i % 4) * (tw + gap), ty + Math.floor(i / 4) * (th + gap)];
    const id = `tile${i}`;
    const done = m.answered.includes(p);
    const l = lit(id);
    parts.push(`<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="${l === "hot" ? "#fff3bf" : done ? "#ebfbee" : "#f8f9fa"}" stroke="${l ? ORANGE : done ? GREEN : "#ced4da"}" stroke-width="${l ? 2.4 : 1.6}"/>`);
    parts.push(tx(x + 22, y + 38, ICONS[p], { size: 20 }));
    // A name may break after a hyphen too; a long word (Georgian ones are) gets a smaller font, to fit the tile's 100 px.
    const name = wrap(words.names[i].replace(/-/g, "- "), 14).map((l) => l.replace(/- /g, "-"));
    const em = /[\u10a0-\u10ff]/.test(words.names[i]) ? 0.72 : 0.62;
    const size = Math.min(13, Math.floor(100 / (em * Math.max(...name.map((l) => l.length)))));
    name.forEach((s, k, a) => parts.push(tx(x + 42, y + 36 + (k - (a.length - 1) / 2) * (size + 3), s, { size, anchor: "start", bold: true })));
    spots.push({ id, x, y, w: tw, h: th, from: false, to: live, label: words.names[i] });
  });
  return { w: W, h: ty + 3 * (th + gap) + 8, body: parts.join(""), spots };
}
