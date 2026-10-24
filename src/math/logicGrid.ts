// Logic grid puzzles, the kind with three or four categories to match up (who owns which dog, born in which year):
// the categories and the clues typed in a small notation, every arrangement that fits counted, and the grid worked
// out a step at a time the way a person does it — the easy moves first ("only one left" in a row, then copying a
// ● pair's marks across), then the clues one at a time, and, when nothing else moves, supposing a pair and finding
// that it breaks a clue. Each step is drawn as the staircase grid with that step's marks lit, and under it the
// candidates still open, by the category of numbers when there is one, so an order clue reads as moves along a row.
import { txt } from "./algoArrays";
import { C, esc, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import type { LogicSpec } from "./logic";
import { composeText, tw } from "./logicPuzzles";

export type GridWords = {
  none: string;
  badCat: string;
  sizes: string;
  tooBig: string;
  twice: string;
  badClue: string;
  unknown: string;
  noOrder: string;
  unsolvable: string;
  title: string;
  start: string;
  clue: string;
  clueWith: string;
  only: string;
  copy: string;
  assume: string;
  assumeClue: string;
  assumeLine: string;
  solved: string;
  stuck: string;
  many: string;
  unique: string;
  candidates: string;
  any: string;
  legend: string;
};

// ---------- reading the puzzle ----------

type Cat = { name: string; items: string[]; nums?: number[] };
/** Two items of different categories belong to the same person or thing; or, on the category of numbers, one is less, more, or more by d. */
type Atom = { k: "same"; x: number; y: number } | { k: "cmp"; x: number; y: number; op: "<" | ">" | "="; d: number };
type GNode = { t: "atom"; a: Atom } | { t: "not"; a: GNode } | { t: "and" | "or" | "imp" | "iff"; a: GNode; b: GNode };
/** `alone`: which pairs meet, and which part, in what the clue allows on its own (worked out when first needed). */
type Clue = { text: string; node: GNode; cats: number[]; alone?: { together: Uint8Array; apart: Uint8Array; any: boolean } };
type Puzzle = { cats: Cat[]; n: number; names: string[]; catOf: number[]; idxOf: number[]; order: number; clues: Clue[] };

const MAX_CATS = 4;
const MAX_ITEMS = 6;
const low = (s: string) => s.trim().toLowerCase();
/** The number an item is, such as 2006, $4.50, 3 kg or 20%; undefined for a name, even one with a digit (Room 3). */
const numberIn = (s: string) => {
  const m = /^[$€£₾]?\s*([−-]?\d+(?:[.,]\d+)?)\s*(?:%|\p{L}{1,4}\.?)?$/u.exec(s.trim());
  return m ? Number(m[1].replace("−", "-").replace(",", ".")) : undefined;
};

function readCats(src: string, w: GridWords): Cat[] {
  const lines = src.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error(w.none);
  const cats = lines.map((line): Cat => {
    const m = /^([^:]+):(.+)$/u.exec(line);
    const items = m ? m[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];
    if (!m || items.length < 2) throw new Error(fill(w.badCat, { s: line }));
    const nums = items.map(numberIn);
    return { name: m[1].trim(), items, ...(nums.every((v) => v !== undefined) ? { nums: nums as number[] } : {}) };
  });
  if (cats.length < 2 || cats.length > MAX_CATS || cats[0].items.length > MAX_ITEMS) throw new Error(fill(w.tooBig, { k: MAX_CATS, n: MAX_ITEMS }));
  const odd = cats.find((c) => c.items.length !== cats[0].items.length);
  if (odd) throw new Error(fill(w.sizes, { s: odd.name, n: cats[0].items.length }));
  const seen = new Set<string>();
  for (const it of cats.flatMap((c) => c.items)) {
    if (seen.has(low(it))) throw new Error(fill(w.twice, { s: it }));
    seen.add(low(it));
  }
  return cats;
}

const CONNECTIVES: [string, "iff" | "imp" | "and" | "or" | "not" | "(" | ")"][] = [
  ["<->", "iff"], ["<=>", "iff"], ["↔", "iff"], ["->", "imp"], ["=>", "imp"], ["→", "imp"],
  ["&&", "and"], ["&", "and"], ["∧", "and"], ["||", "or"], ["|", "or"], ["∨", "or"], ["¬", "not"], ["~", "not"], ["(", "("], [")", ")"],
];

/** A clue in the notation: atoms joined by and, or, not, →, ↔, with brackets. */
function readClue(text: string, no: number, p: Omit<Puzzle, "clues">, w: GridWords): Clue {
  type Tok = { k: "iff" | "imp" | "and" | "or" | "not" | "(" | ")" } | { k: "atom"; s: string };
  const toks: Tok[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) toks.push({ k: "atom", s: buf.trim() });
    buf = "";
  };
  // A {pair} is one atom, whatever it holds.
  let depth = 0;
  outer: for (let i = 0; i < text.length; ) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      for (const [sym, k] of CONNECTIVES) {
        if (text.startsWith(sym, i)) {
          flush();
          toks.push({ k });
          i += sym.length;
          continue outer;
        }
      }
      const word = /^(and|or|not|if|then)(?=[\s(]|$)/i.exec(text.slice(i));
      if (word && (i === 0 || /[\s(]/.test(text[i - 1]))) {
        flush();
        const k = word[1].toLowerCase();
        if (k === "then") toks.push({ k: "imp" });
        else if (k !== "if") toks.push({ k: k as "and" | "or" | "not" });
        i += word[1].length;
        continue;
      }
    }
    buf += text[i++];
  }
  flush();
  let at = 0;
  const fail = () => new Error(fill(w.badClue, { n: no, s: text }));
  const iff = (): GNode => {
    let a = imp();
    while (toks[at]?.k === "iff") (at++, (a = { t: "iff", a, b: imp() }));
    return a;
  };
  const imp = (): GNode => {
    const a = or();
    if (toks[at]?.k !== "imp") return a;
    at++;
    return { t: "imp", a, b: imp() };
  };
  const or = (): GNode => {
    let a = and();
    while (toks[at]?.k === "or") (at++, (a = { t: "or", a, b: and() }));
    return a;
  };
  const and = (): GNode => {
    let a = not();
    while (toks[at]?.k === "and") (at++, (a = { t: "and", a, b: not() }));
    return a;
  };
  const not = (): GNode => {
    if (toks[at]?.k === "not") {
      at++;
      return { t: "not", a: not() };
    }
    const tok = toks[at++];
    if (!tok) throw fail();
    if (tok.k === "(") {
      const a = iff();
      if (toks[at++]?.k !== ")") throw fail();
      return a;
    }
    if (tok.k !== "atom") throw fail();
    return readAtom(tok.s, no, p, w, fail);
  };
  const node = iff();
  if (at < toks.length) throw fail();
  const cats = new Set<number>();
  const walk = (g: GNode) => {
    if (g.t === "atom") {
      cats.add(p.catOf[g.a.x]).add(p.catOf[g.a.y]);
      if (g.a.k === "cmp") cats.add(p.order);
    } else if (g.t === "not") walk(g.a);
    else (walk(g.a), walk(g.b));
  };
  walk(node);
  return { text: text.trim(), node, cats: [...cats].sort((a, b) => a - b) };
}

function readAtom(s: string, no: number, p: Omit<Puzzle, "clues">, w: GridWords, fail: () => Error): GNode {
  const item = (name: string) => {
    const i = p.names.findIndex((x) => low(x) === low(name));
    if (i < 0) throw new Error(fill(w.unknown, { n: no, s: name.trim() }));
    return i;
  };
  const atom = (a: Atom): GNode => ({ t: "atom", a });
  const same = (x: number, y: number) => atom({ k: "same", x, y });
  const and = (a: GNode, b: GNode): GNode => ({ t: "and", a, b });
  const ordered = () => {
    if (p.order < 0) throw new Error(fill(w.noOrder, { n: no }));
  };
  let m: RegExpExecArray | null;
  // {a, b} = {c, d}: of a and b, one is c and the other d.
  if ((m = /^\{(.+?),(.+?)\}\s*=\s*\{(.+?),(.+?)\}$/u.exec(s))) {
    const [a, b, c, d] = m.slice(1).map(item);
    const apart = and({ t: "not", a: same(a, b) }, { t: "not", a: same(c, d) });
    return and(apart, { t: "or", a: and(same(a, c), same(b, d)), b: and(same(a, d), same(b, c)) });
  }
  // a ≠ b ≠ c: all different.
  const parts = s.split(/\s*(?:≠|!=|<>)\s*/u);
  if (parts.length > 1) {
    const ids = parts.map(item);
    const pairs: GNode[] = [];
    ids.forEach((x, i) => ids.slice(i + 1).forEach((y) => pairs.push({ t: "not", a: same(x, y) })));
    return pairs.reduce((a, b) => and(a, b));
  }
  if ((m = /^(.+?)\s*=\s*(.+?)\s*([+−-])\s*(\d+(?:[.,]\d+)?)$/u.exec(s))) {
    ordered();
    const d = Number(m[4].replace(",", "."));
    return atom({ k: "cmp", x: item(m[1]), y: item(m[2]), op: "=", d: m[3] === "+" ? d : -d });
  }
  if ((m = /^(.+?)\s*=\s*(.+)$/u.exec(s))) return same(item(m[1]), item(m[2]));
  if ((m = /^(.+?)\s*([<>])\s*(.+)$/u.exec(s))) {
    ordered();
    return atom({ k: "cmp", x: item(m[1]), y: item(m[3]), op: m[2] as "<" | ">", d: 0 });
  }
  throw fail();
}

function readPuzzle(cats: string, clues: string, w: GridWords): Puzzle {
  const cs = readCats(cats, w);
  const names = cs.flatMap((c) => c.items);
  const catOf = cs.flatMap((c, ci) => c.items.map(() => ci));
  const idxOf = cs.flatMap((c) => c.items.map((_, i) => i));
  const base = { cats: cs, n: cs[0].items.length, names, catOf, idxOf, order: cs.findIndex((c) => c.nums) };
  const lines = clues.split("\n").map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim());
  const read: Clue[] = [];
  lines.forEach((l, i) => l && read.push(readClue(l, i + 1, base, w)));
  return { ...base, clues: read };
}

// ---------- arrangements ----------

/** ent[i]: which person or thing item i belongs to, numbered by the first category used. */
function holds(g: GNode, ent: number[], p: Puzzle, valOf: number[]): boolean {
  switch (g.t) {
    case "not":
      return !holds(g.a, ent, p, valOf);
    case "and":
      return holds(g.a, ent, p, valOf) && holds(g.b, ent, p, valOf);
    case "or":
      return holds(g.a, ent, p, valOf) || holds(g.b, ent, p, valOf);
    case "imp":
      return !holds(g.a, ent, p, valOf) || holds(g.b, ent, p, valOf);
    case "iff":
      return holds(g.a, ent, p, valOf) === holds(g.b, ent, p, valOf);
    case "atom": {
      const a = g.a;
      if (a.k === "same") return ent[a.x] === ent[a.y];
      const [vx, vy] = [valOf[ent[a.x]], valOf[ent[a.y]]];
      return a.op === "<" ? vx < vy : a.op === ">" ? vx > vy : Math.abs(vx - vy - a.d) < 1e-9;
    }
  }
}

/** Counting every arrangement may look at this many; working the steps out, at most STEP_LIMIT more. */
const NODE_LIMIT = 4_000_000;
const STEP_LIMIT = 6_000_000;
type Budget = { nodes: number; limit: number };
class OutOfTime extends Error {}

/**
 * Every way to match up the categories `cats` that respects the marks (● together, ✗ apart) and the clues given,
 * each handed to `visit`. Backtracks an item at a time; a clue is checked once all its categories are placed.
 */
function arrangements(p: Puzzle, cats: number[], marks: Int8Array | null, clues: Clue[], budget: Budget, visit: (ent: number[]) => void, w: GridWords) {
  const N = p.names.length;
  const n = p.n;
  const ent = new Array(N).fill(-1);
  const valOf = new Array(n).fill(0);
  const first = (c: number) => p.catOf.indexOf(c);
  const base = first(cats[0]);
  for (let i = 0; i < n; i++) ent[base + i] = i;
  const rest = cats.slice(1);
  // The clues to check once the category at each place in `rest` is placed (or at once, for the first alone).
  const due = rest.map((_, r) => clues.filter((cl) => cl.cats.every((c) => cats.slice(0, r + 2).includes(c)) && !cl.cats.every((c) => cats.slice(0, r + 1).includes(c))));
  const setVals = () => {
    if (p.order >= 0 && cats.includes(p.order)) for (let i = 0; i < n; i++) valOf[ent[first(p.order) + i]] = p.cats[p.order].nums![i];
  };
  const rec = (r: number, i: number) => {
    if (++budget.nodes > budget.limit) throw budget.limit === NODE_LIMIT ? new Error(fill(w.tooBig, { k: MAX_CATS, n: MAX_ITEMS })) : new OutOfTime();
    if (r === rest.length) {
      visit(ent);
      return;
    }
    const start = first(rest[r]);
    if (i === n) {
      setVals();
      if (!due[r].every((cl) => holds(cl.node, ent, p, valOf))) return;
      return rec(r + 1, 0);
    }
    const me = start + i;
    const taken = new Set(ent.slice(start, me));
    for (let e = 0; e < n; e++) {
      if (taken.has(e)) continue;
      if (marks) {
        let ok = true;
        for (let j = 0; j < N && ok; j++) {
          if (ent[j] < 0 || p.catOf[j] === rest[r]) continue;
          const m = marks[me * N + j];
          if ((m === -1 && ent[j] === e) || (m === 1 && ent[j] !== e)) ok = false;
        }
        if (!ok) continue;
      }
      ent[me] = e;
      rec(r, i + 1);
      ent[me] = -1;
    }
  };
  rec(0, 0);
}

/** How many arrangements fit every clue. */
function countAll(p: Puzzle, w: GridWords): number {
  let count = 0;
  arrangements(p, p.cats.map((_, i) => i), null, p.clues, { nodes: 0, limit: NODE_LIMIT }, () => count++, w);
  return count;
}

/** Every arrangement that fits the clues, as who each item belongs to (numbered by the first category); for checking. */
export function everyAnswer(cats: string, clues: string, w: GridWords): number[][] {
  const p = readPuzzle(cats, clues, w);
  const out: number[][] = [];
  arrangements(p, p.cats.map((_, i) => i), null, p.clues, { nodes: 0, limit: NODE_LIMIT }, (ent) => void out.push([...ent]), w);
  return out;
}

// ---------- working the grid out ----------

type Mark = [number, number, 1 | -1];
export type StepKind = "start" | "clue" | "only" | "copy" | "assume" | "end";
/** A clue step says whether it needed the marks so far; a supposition, which clue it broke (none: a row emptied). */
export type Step = { kind: StepKind; marks: Mark[]; a?: number; b?: number; clue?: number; withMarks?: boolean; why?: number };

/** The grid: for two items of different categories, ● (1), ✗ (−1) or not known yet (0). */
class Grid {
  p: Puzzle;
  M: Int8Array;
  conflict = false;
  constructor(p: Puzzle, M?: Int8Array) {
    this.p = p;
    this.M = M ? new Int8Array(M) : new Int8Array(p.names.length ** 2);
  }
  get N() {
    return this.p.names.length;
  }
  get(a: number, b: number) {
    return this.M[a * this.N + b];
  }
  items(c: number) {
    const s = this.p.catOf.indexOf(c);
    return Array.from({ length: this.p.n }, (_, i) => s + i);
  }
  /** Marks a pair, and a ● rules out the rest of its row and column; a clash is noted, not thrown. */
  put(a: number, b: number, v: 1 | -1, out: Mark[]) {
    const now = this.get(a, b);
    if (now === v) return;
    if (now === -v) {
      this.conflict = true;
      return;
    }
    this.M[a * this.N + b] = v;
    this.M[b * this.N + a] = v;
    out.push([a, b, v]);
    if (v === 1) {
      for (const b2 of this.items(this.p.catOf[b])) if (b2 !== b) this.put(a, b2, -1, out);
      for (const a2 of this.items(this.p.catOf[a])) if (a2 !== a) this.put(a2, b, -1, out);
    }
  }
  /** A row with nothing left is a clash too. */
  empty() {
    const k = this.p.cats.length;
    for (let c = 0; c < k; c++)
      for (let d = 0; d < k; d++) if (c !== d) for (const a of this.items(c)) if (this.items(d).every((b) => this.get(a, b) === -1)) return true;
    return false;
  }
  done() {
    const k = this.p.cats.length;
    for (let c = 0; c < k; c++) for (let d = c + 1; d < k; d++) for (const a of this.items(c)) if (!this.items(d).some((b) => this.get(a, b) === 1)) return false;
    return true;
  }
}

/** One item left in a row (or column) of a block: they go together. */
function onlyOne(g: Grid): Step | undefined {
  const k = g.p.cats.length;
  for (let c = 0; c < k; c++)
    for (let d = 0; d < k; d++) {
      if (c === d) continue;
      for (const a of g.items(c)) {
        const row = g.items(d);
        if (row.some((b) => g.get(a, b) === 1)) continue;
        const open = row.filter((b) => g.get(a, b) === 0);
        if (open.length !== 1) continue;
        const marks: Mark[] = [];
        g.put(a, open[0], 1, marks);
        return { kind: "only", marks, a, b: open[0] };
      }
    }
  return undefined;
}

/** A ● pair: whatever is known of one in a third category is known of the other. */
function copyAcross(g: Grid): Step | undefined {
  const { N, p } = g;
  for (let a = 0; a < N; a++)
    for (let b = a + 1; b < N; b++) {
      if (g.get(a, b) !== 1) continue;
      const marks: Mark[] = [];
      for (let c = 0; c < N; c++) {
        if (p.catOf[c] === p.catOf[a] || p.catOf[c] === p.catOf[b]) continue;
        const [va, vb] = [g.get(a, c), g.get(b, c)];
        if (va && !vb) g.put(b, c, va as 1 | -1, marks);
        else if (vb && !va) g.put(a, c, vb as 1 | -1, marks);
      }
      if (marks.length) return { kind: "copy", marks, a, b };
    }
  return undefined;
}

/**
 * What one clue settles: pairs that never meet in what it allows, and pairs that always do. First the clue on its
 * own, so the moves that follow from it show as their own steps; only when that adds nothing, the clue together
 * with the marks so far.
 */
function byClue(g: Grid, ci: number, budget: Budget, w: GridWords): Step | undefined {
  const { p, N } = g;
  const cl = p.clues[ci];
  if (cl.cats.length < 2) return undefined;
  const ids = cl.cats.flatMap((c) => g.items(c));
  const seen = (marks: Int8Array | null) => {
    const out = { together: new Uint8Array(N * N), apart: new Uint8Array(N * N), any: false };
    arrangements(p, cl.cats, marks, [cl], budget, (ent) => {
      out.any = true;
      for (const a of ids) for (const b of ids) if (p.catOf[a] !== p.catOf[b]) (ent[a] === ent[b] ? out.together : out.apart)[a * N + b] = 1;
    }, w);
    return out;
  };
  for (const withMarks of [false, true]) {
    // What the clue allows on its own never changes, so it is worked out once.
    const { together, apart, any } = withMarks ? seen(g.M) : (cl.alone ??= seen(null));
    if (!any) {
      g.conflict = true;
      return { kind: "clue", marks: [], clue: ci, withMarks };
    }
    const marks: Mark[] = [];
    for (const a of ids)
      for (const b of ids) {
        if (a >= b || p.catOf[a] === p.catOf[b] || g.get(a, b)) continue;
        if (!together[a * N + b]) g.put(a, b, -1, marks);
        else if (!apart[a * N + b]) g.put(a, b, 1, marks);
      }
    if (marks.length) return { kind: "clue", marks, clue: ci, withMarks };
  }
  return undefined;
}

/** The easy moves first, then the clues in order: the next step, or nothing when none of them moves. */
function nextEasy(g: Grid, budget: Budget, w: GridWords): Step | undefined {
  const easy = onlyOne(g) ?? copyAcross(g);
  if (easy) return easy;
  for (let ci = 0; ci < g.p.clues.length; ci++) {
    const s = byClue(g, ci, budget, w);
    if (s) return s;
  }
  return undefined;
}

/**
 * Supposes each open pair goes together and follows the easy moves and clues: if that runs into a clash (a clue that
 * can no longer hold, or a row with nothing left), the pair is ruled out.
 */
function bySupposing(g: Grid, budget: Budget, w: GridWords): Step | undefined {
  const { N, p } = g;
  for (let a = 0; a < N; a++)
    for (let b = a + 1; b < N; b++) {
      if (p.catOf[a] === p.catOf[b] || g.get(a, b)) continue;
      const t = new Grid(p, g.M);
      t.put(a, b, 1, []);
      let why: number | undefined;
      for (let guard = 0; !t.conflict && !t.empty() && guard < 200; guard++) {
        const s = nextEasy(t, budget, w);
        if (!s) break;
        if (t.conflict && s.kind === "clue") why = s.clue;
      }
      if (t.conflict || t.empty()) {
        const marks: Mark[] = [];
        g.put(a, b, -1, marks);
        return { kind: "assume", marks, a, b, why };
      }
    }
  return undefined;
}

export type Worked = { p: Puzzle; steps: Step[]; count: number; solved: boolean };

let cache: { key: string; worked: Worked } | undefined;

/** The puzzle worked out: every step from the empty grid, and how many arrangements fit the clues. */
export function workGrid(cats: string, clues: string, w: GridWords): Worked {
  const key = `${cats}\u0000${clues}\u0000${w.none}`;
  if (cache?.key === key) return cache.worked;
  const p = readPuzzle(cats, clues, w);
  const count = countAll(p, w);
  if (!count) throw new Error(w.unsolvable);
  const g = new Grid(p);
  const steps: Step[] = [{ kind: "start", marks: [] }];
  const budget = { nodes: 0, limit: STEP_LIMIT };
  try {
    while (!g.done()) {
      const s = nextEasy(g, budget, w) ?? bySupposing(g, budget, w);
      if (!s) break;
      steps.push(s);
    }
  } catch (e) {
    // A step that would take too long ends the steps where they are; anything else is a real fault.
    if (!(e instanceof OutOfTime)) throw e;
  }
  const worked = { p, steps, count, solved: g.done() };
  cache = { key, worked };
  return worked;
}

// ---------- the picture ----------

const CELL = 22;
const GREY = "#868e96";
const LIT = "#fff3bf";

/** The marks after `upto` steps, and the cells the last of them set. */
function marksAt(wk: Worked, upto: number): { g: Grid; lit: Set<number> } {
  const g = new Grid(wk.p);
  const lit = new Set<number>();
  wk.steps.slice(1, upto + 1).forEach((s, i) => {
    for (const [a, b, v] of s.marks) {
      g.M[a * g.N + b] = v;
      g.M[b * g.N + a] = v;
      if (i === upto - 1) lit.add(a * g.N + b).add(b * g.N + a);
    }
  });
  return { g, lit };
}

/**
 * The staircase grid: the categories after the first across the top; down the side the first, then the last, the
 * one before it and so on, so every pair of categories meets in exactly one block.
 */
function drawGrid(g: Grid, lit: Set<number>): { svg: string; width: number; h: number } {
  const { p } = g;
  const k = p.cats.length;
  const n = p.n;
  const cols = Array.from({ length: k - 1 }, (_, i) => i + 1);
  const rows = [0, ...Array.from({ length: k - 2 }, (_, i) => k - 1 - i)];
  const nameW = (c: number) => Math.max(...p.cats[c].items.map((s) => tw(s, 12)));
  const labelW = Math.max(...rows.map(nameW)) + 12;
  const headH = Math.max(...cols.map(nameW)) + 12;
  const catBand = 18;
  const x0 = catBand + labelW;
  const y0 = catBand + headH;
  const block = n * CELL;
  const parts: string[] = [];
  cols.forEach((c, ci) => {
    const bx = x0 + ci * block;
    parts.push(txt(bx + block / 2, 13, p.cats[c].name, { size: 12.5, anchor: "middle", bold: true, color: C.blue }));
    p.cats[c].items.forEach((it, i) => {
      const cx = bx + i * CELL + CELL / 2 + 4;
      parts.push(`<text transform="translate(${r2(cx)} ${y0 - 6}) rotate(-90)" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif" font-size="12" fill="${C.ink}">${esc(it)}</text>`);
    });
  });
  rows.forEach((r, ri) => {
    const by = y0 + ri * block;
    parts.push(`<text transform="translate(13 ${r2(by + block / 2)}) rotate(-90)" text-anchor="middle" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif" font-size="12.5" font-weight="700" fill="${C.blue}">${esc(p.cats[r].name)}</text>`);
    p.cats[r].items.forEach((it, i) => parts.push(txt(x0 - 6, by + i * CELL + CELL / 2 + 4, it, { size: 12, anchor: "end" })));
    cols.forEach((c, ci) => {
      if (ci >= k - 1 - ri) return;
      const bx = x0 + ci * block;
      const as = g.items(r);
      const bs = g.items(c);
      as.forEach((a, i) =>
        bs.forEach((b, j) => {
          const x = bx + j * CELL;
          const y = by + i * CELL;
          const v = g.get(a, b);
          const on = lit.has(a * g.N + b);
          parts.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${CELL}" height="${CELL}" fill="${on ? LIT : "#fff"}" stroke="#dee2e6"/>`);
          if (v === -1) parts.push(txt(x + CELL / 2, y + CELL / 2 + 5, "✗", { size: 13, anchor: "middle", color: on ? C.red : GREY }));
          if (v === 1) parts.push(`<circle cx="${r2(x + CELL / 2)}" cy="${r2(y + CELL / 2)}" r="6.5" fill="${C.green}"/>`);
        }),
      );
      parts.push(`<rect x="${r2(bx)}" y="${r2(by)}" width="${block}" height="${block}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`);
    });
  });
  const width = x0 + cols.length * block + 2;
  return { svg: parts.join(""), width, h: y0 + rows.length * block + 2 };
}

/**
 * What each one can still be, a column per item of the category of numbers (or of the first category): the item
 * once only one is left, else the ones still open, and "any" while nothing is ruled out.
 */
function drawCandidates(g: Grid, title: string, any: string): { svg: string; h: number } {
  const { p } = g;
  const by = p.order >= 0 ? p.order : 0;
  const others = p.cats.map((_, i) => i).filter((c) => c !== by);
  const labelW = Math.max(...others.map((c) => tw(p.cats[c].name, 12.5))) + 14;
  const colW = (W - 48 - labelW) / p.n;
  const cellLines = (a: number, c: number) => {
    const open = g.items(c).filter((b) => g.get(a, b) !== -1);
    if (open.length === 1 || open.some((b) => g.get(a, b) === 1)) return { lines: [p.names[open.find((b) => g.get(a, b) === 1) ?? open[0]]], one: true };
    if (open.length === p.n) return { lines: [any], one: false };
    // Wrap the open ones into lines that fit the column.
    const lines: string[] = [];
    for (const b of open) {
      const word = p.names[b];
      const lastLine = lines[lines.length - 1];
      if (lastLine !== undefined && tw(`${lastLine} / ${word}`, 11) < colW - 8) lines[lines.length - 1] = `${lastLine} / ${word}`;
      else lines.push(word);
    }
    return { lines, one: false };
  };
  const parts: string[] = [txt(0, 14, title, { size: 13, bold: true, color: "#495057" })];
  const top = 24;
  parts.push(`<rect x="0" y="${top}" width="${r2(labelW + colW * p.n)}" height="24" fill="#f1f3f5"/>`);
  g.items(by).forEach((a, i) => parts.push(txt(labelW + i * colW + colW / 2, top + 16.5, p.names[a], { size: 12.5, anchor: "middle", bold: true })));
  let y = top + 24;
  for (const c of others) {
    const cells = g.items(by).map((a) => cellLines(a, c));
    const rowH = Math.max(24, 8 + 14 * Math.max(...cells.map((x) => x.lines.length)));
    parts.push(txt(6, y + rowH / 2 + 4.5, p.cats[c].name, { size: 12.5, bold: true, color: C.blue }));
    cells.forEach((cell, i) => {
      const cx = labelW + i * colW + colW / 2;
      const y1 = y + rowH / 2 - ((cell.lines.length - 1) * 14) / 2 + 4.5;
      cell.lines.forEach((l, li) =>
        parts.push(txt(cx, y1 + li * 14, l, cell.one ? { size: 12.5, anchor: "middle", bold: true, color: C.green } : { size: 11, anchor: "middle", color: "#495057" })),
      );
    });
    parts.push(`<line x1="0" y1="${r2(y + rowH)}" x2="${r2(labelW + colW * p.n)}" y2="${r2(y + rowH)}" stroke="#dee2e6"/>`);
    y += rowH;
  }
  parts.push(`<rect x="0" y="${top}" width="${r2(labelW + colW * p.n)}" height="${r2(y - top)}" fill="none" stroke="#adb5bd"/>`);
  for (let i = 0; i <= p.n; i++) parts.push(`<line x1="${r2(labelW + i * colW)}" y1="${top}" x2="${r2(labelW + i * colW)}" y2="${r2(y)}" stroke="#dee2e6"/>`);
  return { svg: `<g transform="translate(24 0)">${parts.join("")}</g>`, h: y };
}

/** What the step did, in words. */
function stepText(wk: Worked, s: Step, w: GridWords): string {
  const name = (i: number) => wk.p.names[i];
  const x = s.marks.filter((m) => m[2] === -1).length;
  const o = s.marks.filter((m) => m[2] === 1).length;
  // What it marked, leaving out a kind it marked none of.
  const marks = [x ? `✗ ${x}` : "", o ? `● ${o}` : ""].filter(Boolean).join("\u00a0· ");
  switch (s.kind) {
    case "start":
      return fill(w.start, { n: wk.p.clues.length });
    case "clue":
      return fill(s.withMarks ? w.clueWith : w.clue, { n: s.clue! + 1, s: wk.p.clues[s.clue!].text, marks });
    case "only":
      return fill(w.only, { a: name(s.a!), b: name(s.b!) });
    case "copy":
      return fill(w.copy, { a: name(s.a!), b: name(s.b!), marks });
    default:
      return fill(w.assume, {
        a: name(s.a!),
        b: name(s.b!),
        why: s.why === undefined ? w.assumeLine : fill(w.assumeClue, { n: s.why + 1 }),
      });
  }
}

/** The grid after `step` steps (all of them when it is missing), with what that step did and the candidates. */
export function renderGrid(spec: LogicSpec, w: GridWords): RenderedSvg {
  const wk = workGrid(spec.f, spec.g, w);
  const last = wk.steps.length - 1;
  const k = spec.step === undefined ? last : Math.max(0, Math.min(last, spec.step));
  const { g, lit } = marksAt(wk, k);
  const grid = drawGrid(g, lit);
  const scale = Math.min(1, (W - 48) / grid.width);
  const gx = (W - grid.width * scale) / 2;
  const cand = drawCandidates(g, w.candidates, w.any);
  const gh = grid.h * scale;
  const body = `<g transform="translate(${r2(gx)} 0) scale(${r2(scale * 1000) / 1000})">${grid.svg}</g><g transform="translate(0 ${r2(gh + 22)})">${cand.svg}</g>`;
  const caps: Caption[] = [{ text: stepText(wk, wk.steps[k], w), color: wk.steps[k].kind === "start" ? C.ink : C.blue }];
  if (k === last) {
    if (wk.solved) caps.push({ text: fill(w.solved, { n: last }), color: C.green });
    else caps.push({ text: wk.count === 1 ? w.stuck : fill(w.many, { k: wk.count }), color: C.orange });
    if (wk.count === 1 && !wk.solved) caps.push({ text: w.unique, color: C.ink });
  }
  caps.push({ text: w.legend, color: GREY });
  return composeText(fill(w.title, { k, n: last }), body, gh + 22 + cand.h, caps);
}

/** How many steps the puzzle takes, for the stepper; 0 when it can't be read. */
export function gridSteps(spec: LogicSpec, w: GridWords): number {
  try {
    return workGrid(spec.f, spec.g, w).steps.length - 1;
  } catch {
    return 0;
  }
}

// ---------- examples ----------

/** An example opens on the empty grid, to be stepped through. */
const gr = (f: string, g: string): LogicSpec => ({ topic: "grid", f, g, vals: "", tf: true, step: 0 });

const DOGS = "Owner: Anita, Barbara, Douglas, Fernando\nYear: 2006, 2007, 2008, 2009\nBreed: beagle, boxer, collie, poodle\nDog: Molly, Riley, Sam, Toby";
const DOG_CLUES = "Riley = beagle + 1\nAnita = 2008 | Anita = poodle\nToby < Molly\nDouglas ≠ beagle ≠ 2009\n{Barbara, Toby} = {2006, poodle}\nRiley = boxer\nFernando ≠ Sam";

export const GRID_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "Three friends", spec: gr("Friend: Ann, Ben, Cara\nPet: cat, dog, fish\nColour: red, green, blue", "Ann ≠ cat\nBen = fish\ncat = blue\nAnn ≠ green") },
  { label: "Prices", spec: gr("Shopper: Lia, Nino, Saba\nPrice: $4, $5, $6\nFruit: apples, grapes, pears", "Lia = Nino + 1\nSaba ≠ $5\npears < grapes\nSaba ≠ pears\napples = $5") },
  { label: "Dogs by year", spec: gr(DOGS, "Fernando = 2007\n" + DOG_CLUES) },
  {
    label: "Needs a supposition",
    spec: gr(
      "Friend: Ana, Beka, Dato, Eka\nHobby: chess, drawing, guitar, tennis\nTicket: $10, $20, $30, $40\nCity: Batumi, Gori, Kutaisi, Telavi",
      "$40 ≠ guitar\ntennis < Ana\n{Telavi, Kutaisi} = {drawing, chess}\nBatumi = Dato - 10\n{drawing, tennis} = {$10, $20}\nKutaisi = Eka - 20",
    ),
  },
  // The dogs without their first clue: seven answers fit.
  { label: "Not enough clues", spec: gr(DOGS, DOG_CLUES) },
  { label: "Три друга", spec: gr("Друг: Аня, Боря, Вера\nПитомец: кошка, собака, рыбка\nЦвет: красный, зелёный, синий", "Аня ≠ кошка\nБоря = рыбка\nкошка = синий\nАня ≠ зелёный") },
  { label: "სამი მეგობარი", spec: gr("მეგობარი: ნინო, ლევანი, თამარი\nცხოველი: კატა, ძაღლი, თევზი\nფერი: წითელი, მწვანე, ლურჯი", "ნინო ≠ კატა\nლევანი = თევზი\nკატა = ლურჯი\nნინო ≠ მწვანე") },
];
