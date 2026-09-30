// Logic puzzles as they appear in reasoning tests: constraint boards (grouping into bins, ordering
// into slots) with the constraints in a compact notation, every conditional written together with
// its contrapositive, what is forced before any question is read, what follows from an "if …"
// assumption, and the sweep of answer options; and truth-teller / liar (knights and knaves) puzzles.
import { txt } from "./algoArrays";
import { C, compose, esc, fill, FONT, r2, W, wrap, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import { evalNode, fit, GREEN_BG, parseFormula, RED_BG, rowsFor, toTexWith, truthTable, type LogicSpec, type LogicWords, type Node, type TCol } from "./logic";

export type BoardMode = "bins" | "slots";
export const BOARD_MODES: BoardMode[] = ["bins", "slots"];
/** places: "Chveli(3), Kala(3), Latpari(1)" or slot names; rules: one per line; ask: an "if …" assumption; options: one per line. */
export type BoardSpec = { mode: BoardMode; places: string; pool: string; rules: string; ask: string; options: string };

export type BoardWords = {
  pool: string;
  noPlaces: string;
  badPlace: string;
  noPool: string;
  twice: string;
  ruledOut: string;
  badRule: string;
  unknownItem: string;
  unknownPlace: string;
  tooBig: string;
  badOption: string;
  slotsTitle: string;
  constraints: string;
  grid: string;
  gridIf: string;
  legend: string;
  none: string;
  unique: string;
  many: string;
  forced: string;
  noneForced: string;
  ifNone: string;
  ifSome: string;
  ifNothingNew: string;
  sweep: string;
  size: string;
  survivors: string;
  noSurvivor: string;
  statements: string;
  stMust: string;
  stNever: string;
  stCould: string;
  stFixes: string;
  info: string;
};

export type KnightsWords = {
  empty: string;
  badLine: string;
  knight: string;
  knave: string;
  isTrue: string;
  isFalse: string;
  unique: string;
  many: string;
  none: string;
  always: string;
  legend: string;
  info: string;
};

// ---------- shared drawing ----------

/** Rough text width, enough to lay out boxes (Georgian letters run wider). */
export const tw = (s: string, size: number) => [...s].reduce((a, ch) => a + (/[Ⴀ-ჿ]/.test(ch) ? 0.8 : /[A-ZА-Я@≠∉]/.test(ch) ? 0.68 : 0.56) * size, 0);

/** Like compose, but with a plain-text title (names may be in any script). */
export function composeText(title: string, body: string, bodyH: number, captions: Caption[]): RenderedSvg {
  const top = 48;
  const lines = captions.flatMap((c) => wrap(c.text).map((text) => ({ text, color: c.color ?? C.ink })));
  const capTop = top + bodyH + 12;
  const H = Math.ceil(capTop + lines.length * 21 + (lines.length ? 10 : 0));
  const caps = lines
    .map((l, i) => `<text x="${W / 2}" y="${capTop + 15 + i * 21}" text-anchor="middle" ${FONT} font-size="14.5" font-weight="600" fill="${l.color}">${esc(l.text)}</text>`)
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    `<text x="${W / 2}" y="32" text-anchor="middle" ${FONT} font-size="17" font-weight="700" fill="${C.ink}">${esc(title)}</text>` +
    `<g transform="translate(0 ${top})">${body}</g>${caps}</svg>`;
  return { svg, width: W, height: H };
}

// ---------- the board: places, items, constraints ----------

type Place = { name: string; min: number; max: number; tags: Set<string> };
type Atom =
  | { k: "at"; x: number; tag: string }
  | { k: "same"; x: number; y: number }
  | { k: "before"; x: number; y: number }
  | { k: "block"; x: number; y: number }
  | { k: "adj"; x: number; y: number };
type CNode = { t: "atom"; a: Atom } | { t: "not"; a: CNode } | { t: "and" | "or" | "imp" | "iff"; a: CNode; b: CNode };
type Board = { mode: BoardMode; places: Place[]; items: string[]; tags: Map<string, string> };

const low = (s: string) => s.trim().toLowerCase();

function readBoard(spec: BoardSpec, w: BoardWords): Board {
  const places: Place[] = [];
  const src = spec.places.trim();
  if (!src) throw new Error(w.noPlaces);
  if (spec.mode === "slots") {
    const names = /^\d+$/.test(src) ? Array.from({ length: Math.min(12, Number(src)) }, (_, i) => String(i + 1)) : src.split(/[,;\s]+/).filter(Boolean);
    names.forEach((name, i) => places.push({ name, min: 0, max: 1, tags: new Set([name, String(i + 1), ...name.split(/[-_.·]+/).filter(Boolean)].map(low)) }));
  } else {
    for (const part of src.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)) {
      const m = /^(.+?)\s*(?:\(\s*(≤|<=)?\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*\))?$/u.exec(part);
      if (!m || !m[1].trim()) throw new Error(fill(w.badPlace, { s: part }));
      const n = m[3] === undefined ? undefined : Number(m[3]);
      const [min, max] = n === undefined ? [0, Infinity] : m[2] ? [0, n] : m[4] !== undefined ? [n, Number(m[4])] : [n, n];
      places.push({ name: m[1].trim(), min, max, tags: new Set([low(m[1])]) });
    }
  }
  const items = spec.pool.split(/[,;\s]+/).filter(Boolean);
  if (!items.length) throw new Error(w.noPool);
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(low(it))) throw new Error(fill(w.twice, { s: it }));
    seen.add(low(it));
  }
  if (items.length > 10 || places.length > 12) throw new Error(fill(w.tooBig, { n: 10, m: 12 }));
  // Tag spelling as the user typed it first, for printing.
  const tags = new Map<string, string>();
  places.forEach((p, i) => {
    tags.set(low(p.name), p.name);
    if (spec.mode === "slots") {
      if (!tags.has(String(i + 1))) tags.set(String(i + 1), String(i + 1));
      for (const part of p.name.split(/[-_.·]+/).filter(Boolean)) if (!tags.has(low(part))) tags.set(low(part), part);
    }
  });
  return { mode: spec.mode, places, items, tags };
}

const CONNECTIVES: [string, "iff" | "imp" | "and" | "or" | "not" | "(" | ")"][] = [
  ["<->", "iff"], ["<=>", "iff"], ["↔", "iff"], ["⇔", "iff"], ["->", "imp"], ["=>", "imp"], ["→", "imp"], ["⇒", "imp"],
  ["&&", "and"], ["&", "and"], ["∧", "and"], ["||", "or"], ["|", "or"], ["∨", "or"], ["¬", "not"], ["~", "not"], ["(", "("], [")", ")"],
];

function parseRule(s: string, b: Board, w: BoardWords): CNode {
  type Tok = { k: "iff" | "imp" | "and" | "or" | "not" | "(" | ")" } | { k: "atom"; s: string };
  const toks: Tok[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) toks.push({ k: "atom", s: buf.trim() });
    buf = "";
  };
  outer: for (let i = 0; i < s.length; ) {
    for (const [sym, k] of CONNECTIVES) {
      if (s.startsWith(sym, i)) {
        flush();
        toks.push({ k });
        i += sym.length;
        continue outer;
      }
    }
    const word = /^(and|or|not|if|then)(?=[\s(]|$)/i.exec(s.slice(i));
    if (word && (i === 0 || /[\s(]/.test(s[i - 1]))) {
      flush();
      const k = word[1].toLowerCase();
      if (k === "then") toks.push({ k: "imp" });
      else if (k !== "if") toks.push({ k: k as "and" | "or" | "not" });
      i += word[1].length;
      continue;
    }
    buf += s[i++];
  }
  flush();
  let p = 0;
  const fail = () => new Error(fill(w.badRule, { s }));
  const iff = (): CNode => {
    let a = imp();
    while (toks[p]?.k === "iff") (p++, (a = { t: "iff", a, b: imp() }));
    return a;
  };
  const imp = (): CNode => {
    const a = or();
    if (toks[p]?.k !== "imp") return a;
    p++;
    return { t: "imp", a, b: imp() };
  };
  const or = (): CNode => {
    let a = and();
    while (toks[p]?.k === "or") (p++, (a = { t: "or", a, b: and() }));
    return a;
  };
  const and = (): CNode => {
    let a = not();
    while (toks[p]?.k === "and") (p++, (a = { t: "and", a, b: not() }));
    return a;
  };
  const not = (): CNode => {
    if (toks[p]?.k === "not") {
      p++;
      return { t: "not", a: not() };
    }
    const t = toks[p++];
    if (!t) throw fail();
    if (t.k === "(") {
      const a = iff();
      if (toks[p++]?.k !== ")") throw fail();
      return a;
    }
    if (t.k !== "atom") throw fail();
    return parseAtom(t.s, b, w);
  };
  const node = iff();
  if (p < toks.length) throw fail();
  return node;
}

function parseAtom(s: string, b: Board, w: BoardWords): CNode {
  const item = (name: string) => {
    const i = b.items.findIndex((x) => low(x) === low(name));
    if (i < 0) throw new Error(fill(w.unknownItem, { s: name.trim() }));
    return i;
  };
  const tag = (name: string) => {
    if (!b.tags.has(low(name))) throw new Error(fill(w.unknownPlace, { s: name.trim() }));
    return low(name);
  };
  const atom = (a: Atom): CNode => ({ t: "atom", a });
  let m: RegExpExecArray | null;
  if ((m = /^\[\s*(.+?)\s*[·•,\s]+\s*(.+?)\s*\]$/u.exec(s))) return atom({ k: "block", x: item(m[1]), y: item(m[2]) });
  if ((m = /^\{\s*(.+?)\s*[·•,\s]+\s*(.+?)\s*\}$/u.exec(s))) return atom({ k: "adj", x: item(m[1]), y: item(m[2]) });
  if ((m = /^(.+?)\s*∉\s*(.+)$/u.exec(s))) return { t: "not", a: atom({ k: "at", x: item(m[1]), tag: tag(m[2]) }) };
  if ((m = /^(.+?)\s*[@∈]\s*(.+)$/u.exec(s))) return atom({ k: "at", x: item(m[1]), tag: tag(m[2]) });
  if ((m = /^(.+?)\s*(?:≠|!=|<>)\s*(.+)$/u.exec(s))) return { t: "not", a: atom({ k: "same", x: item(m[1]), y: item(m[2]) }) };
  if ((m = /^(.+?)\s*=\s*(.+)$/u.exec(s))) return atom({ k: "same", x: item(m[1]), y: item(m[2]) });
  if ((m = /^(.+?)\s*<\s*(.+)$/u.exec(s))) return atom({ k: "before", x: item(m[1]), y: item(m[2]) });
  if ((m = /^(.+?)\s*>\s*(.+)$/u.exec(s))) return atom({ k: "before", x: item(m[2]), y: item(m[1]) });
  throw new Error(fill(w.badRule, { s }));
}

/** pos[i] is the place index of item i, or −1 when it has none. */
function holds(n: CNode, pos: number[], b: Board): boolean {
  switch (n.t) {
    case "not":
      return !holds(n.a, pos, b);
    case "and":
      return holds(n.a, pos, b) && holds(n.b, pos, b);
    case "or":
      return holds(n.a, pos, b) || holds(n.b, pos, b);
    case "imp":
      return !holds(n.a, pos, b) || holds(n.b, pos, b);
    case "iff":
      return holds(n.a, pos, b) === holds(n.b, pos, b);
    case "atom": {
      const a = n.a;
      if (a.k === "at") return pos[a.x] >= 0 && b.places[pos[a.x]].tags.has(a.tag);
      const px = pos[a.x];
      const py = pos[a.y];
      if (px < 0 || py < 0) return false;
      if (a.k === "same") return px === py;
      if (a.k === "before") return px < py;
      if (a.k === "block") return py === px + 1;
      return Math.abs(px - py) === 1;
    }
  }
}

function itemsOf(n: CNode): number[] {
  if (n.t === "atom") return n.a.k === "at" ? [n.a.x] : [n.a.x, n.a.y];
  if (n.t === "not") return itemsOf(n.a);
  return [...itemsOf(n.a), ...itemsOf(n.b)];
}

/** Pushes a negation inwards, so ¬(E@Chveli) prints as E∉Chveli and ¬(a ∧ b) as ¬a ∨ ¬b. */
function negate(n: CNode): CNode {
  switch (n.t) {
    case "not":
      return n.a;
    case "and":
      return { t: "or", a: negate(n.a), b: negate(n.b) };
    case "or":
      return { t: "and", a: negate(n.a), b: negate(n.b) };
    case "imp":
      return { t: "and", a: n.a, b: negate(n.b) };
    default:
      return { t: "not", a: n };
  }
}

function show(n: CNode, b: Board, top = true): string {
  const it = (i: number) => b.items[i];
  const tagName = (t: string) => b.tags.get(t) ?? t;
  // Letters stay tight (C=G), names get room (Borjomi < Tsqaltubo).
  const rel = (x: string, op: string, y: string, long = x.length > 1 || y.length > 1) => (long ? `${x} ${op} ${y}` : `${x}${op}${y}`);
  const atom = (a: Atom, neg: boolean): string => {
    switch (a.k) {
      case "at":
        return neg ? rel(it(a.x), "∉", tagName(a.tag), it(a.x).length > 1) : `${it(a.x)}@${tagName(a.tag)}`;
      case "same":
        return rel(it(a.x), neg ? "≠" : "=", it(a.y));
      case "before":
        // Two items never share a slot, so "not before" is "after".
        return neg ? (b.mode === "slots" ? rel(it(a.y), "<", it(a.x)) : `¬(${rel(it(a.x), "<", it(a.y))})`) : rel(it(a.x), "<", it(a.y));
      case "block":
        return `${neg ? "¬" : ""}[${it(a.x)}·${it(a.y)}]`;
      case "adj":
        return `${neg ? "¬" : ""}{${it(a.x)}·${it(a.y)}}`;
    }
  };
  if (n.t === "atom") return atom(n.a, false);
  if (n.t === "not") return n.a.t === "atom" ? atom(n.a.a, true) : `¬(${show(n.a, b, false)})`;
  const op = { and: " ∧ ", or: " ∨ ", imp: " → ", iff: " ↔ " }[n.t];
  const s = show(n.a, b, false) + op + show(n.b, b, false);
  return top ? s : `(${s})`;
}

type Solved = { count: number; possible: boolean[][]; first?: number[] };
const NODE_LIMIT = 3_000_000;

/** Every arrangement that satisfies the constraints, by backtracking (a constraint is checked as soon as its items are placed). */
function solve(b: Board, rules: CNode[], w: BoardWords, visit?: (pos: number[]) => void): Solved {
  const n = b.items.length;
  const P = b.places.length;
  const due: CNode[][] = Array.from({ length: n }, () => []);
  for (const r of rules) due[Math.max(...itemsOf(r))].push(r);
  const pos = new Array(n).fill(-1);
  const counts = new Array(P).fill(0);
  const possible = Array.from({ length: n }, () => new Array(P).fill(false));
  let count = 0;
  let first: number[] | undefined;
  let nodes = 0;
  const minsLeft = () => b.places.reduce((s, p, i) => s + Math.max(0, p.min - counts[i]), 0);
  const rec = (i: number) => {
    if (++nodes > NODE_LIMIT) throw new Error(fill(w.tooBig, { n: 10, m: 12 }));
    if (i === n) {
      if (minsLeft()) return;
      count++;
      pos.forEach((p, k) => (possible[k][p] = true));
      first ??= [...pos];
      visit?.(pos);
      return;
    }
    for (let p = 0; p < P; p++) {
      if (counts[p] >= b.places[p].max) continue;
      pos[i] = p;
      counts[p]++;
      if (minsLeft() <= n - i - 1 && due[i].every((r) => holds(r, pos, b))) rec(i + 1);
      counts[p]--;
    }
    pos[i] = -1;
  };
  rec(0);
  return { count, possible, first };
}

// ---------- the board: pictures ----------

/** Places a block at the left margin, scaled down when it is too wide. */
function left(svg: string, width: number, h: number): { svg: string; h: number } {
  const k = Math.min(1, (W - 48) / width);
  return { svg: `<g transform="translate(24 0) scale(${r2(k * 1000) / 1000})">${svg}</g>`, h: h * k };
}

function drawBins(b: Board, s: Solved, w: BoardWords): { svg: string; h: number } {
  const parts: string[] = [];
  const boxes = b.places.map((p, pi) => {
    const forced = b.items.filter((_, i) => s.count && s.possible[i].filter(Boolean).length === 1 && s.possible[i][pi]);
    const canHere = b.items.filter((_, i) => s.possible[i][pi]).length;
    const seats = Math.max(forced.length, Number.isFinite(p.max) ? p.max : Math.max(1, canHere));
    const cap = Number.isFinite(p.max) ? (p.min === p.max ? `(${p.max})` : `(${p.min}–${p.max})`) : "";
    const head = `${p.name}${cap}`;
    const seatW = Math.max(30, ...forced.map((f) => tw(f, 14) + 10));
    return { head, forced, seats, seatW, w: Math.max(tw(head, 14) + 24, seats * seatW + 20) };
  });
  const gap = 14;
  let x = 24;
  let y = 0;
  const rowH = 78;
  for (const bx of boxes) {
    if (x + bx.w > W - 24 && x > 24) (x = 24), (y += rowH + 10);
    parts.push(`<rect x="${r2(x)}" y="${y}" width="${r2(bx.w)}" height="${rowH}" rx="8" fill="#f8f9fa" stroke="#adb5bd" stroke-width="1.4"/>`);
    parts.push(txt(x + bx.w / 2, y + 22, bx.head, { size: 14, anchor: "middle", bold: true }));
    const x0 = x + (bx.w - bx.seats * bx.seatW) / 2;
    for (let k = 0; k < bx.seats; k++) {
      const sx = x0 + k * bx.seatW;
      parts.push(`<line x1="${r2(sx + 5)}" y1="${y + 60}" x2="${r2(sx + bx.seatW - 5)}" y2="${y + 60}" stroke="${C.ink}" stroke-width="1.6"/>`);
      if (bx.forced[k]) parts.push(txt(sx + bx.seatW / 2, y + 54, bx.forced[k], { size: 15, anchor: "middle", bold: true, color: C.blue }));
    }
    x += bx.w + gap;
  }
  return { svg: parts.join(""), h: y + rowH };
}

function drawSlots(b: Board, s: Solved): { svg: string; h: number } {
  const parts: string[] = [];
  const forcedAt = b.places.map((_, pi) => b.items.find((_, i) => s.count && s.possible[i].filter(Boolean).length === 1 && s.possible[i][pi]));
  const cw = b.places.map((p, pi) => Math.max(44, tw(p.name, 11.5) + 10, forcedAt[pi] ? tw(forcedAt[pi]!, 13) + 8 : 0));
  let x = 24;
  let y = 0;
  const rowH = 58;
  b.places.forEach((p, pi) => {
    if (x + cw[pi] > W - 24 && x > 24) (x = 24), (y += rowH);
    parts.push(txt(x + cw[pi] / 2, y + 14, p.name, { size: 11.5, anchor: "middle", color: "#495057" }));
    parts.push(`<line x1="${r2(x + 5)}" y1="${y + 44}" x2="${r2(x + cw[pi] - 5)}" y2="${y + 44}" stroke="${C.ink}" stroke-width="1.6"/>`);
    if (forcedAt[pi]) {
      parts.push(txt(x + cw[pi] / 2, y + 39, forcedAt[pi]!, { size: 13, anchor: "middle", bold: true, color: C.blue }));
      parts.push(txt(x + cw[pi] / 2, y + 56, "^", { size: 11, anchor: "middle", color: C.blue }));
    }
    x += cw[pi];
  });
  return { svg: parts.join(""), h: y + rowH };
}

/** Items × places: ● the only place left, ○ still possible, blank ruled out. */
function drawGrid(b: Board, s: Solved, title: string, base?: Solved): { svg: string; h: number } {
  const labelW = Math.max(40, ...b.items.map((it) => tw(it, 13) + 16));
  const cw = b.places.map((p) => Math.max(34, tw(p.name, 11.5) + 12));
  const total = labelW + cw.reduce((a, c) => a + c, 0);
  const rowH = 22;
  const parts: string[] = [txt(0, 14, title, { size: 13, bold: true, color: "#495057" })];
  const top = 22;
  parts.push(`<rect x="0" y="${top}" width="${total}" height="24" fill="#f1f3f5"/>`);
  let x = labelW;
  b.places.forEach((p, pi) => {
    parts.push(txt(x + cw[pi] / 2, top + 16, p.name, { size: 11.5, anchor: "middle", bold: true, color: "#495057" }));
    x += cw[pi];
  });
  b.items.forEach((it, i) => {
    const y = top + 24 + i * rowH;
    const one = s.possible[i].filter(Boolean).length === 1;
    parts.push(txt(10, y + 15.5, it, { size: 13, bold: true }));
    let cx = labelW;
    b.places.forEach((_, pi) => {
      const on = s.possible[i][pi];
      const was = base ? base.possible[i][pi] : on;
      const wasOne = base ? base.possible[i].filter(Boolean).length === 1 : one;
      if (!on) parts.push(`<rect x="${r2(cx + 1)}" y="${y + 1}" width="${r2(cw[pi] - 2)}" height="${rowH - 2}" fill="${was ? RED_BG : "#f8f9fa"}"/>`);
      else if (one && !wasOne) parts.push(`<rect x="${r2(cx + 1)}" y="${y + 1}" width="${r2(cw[pi] - 2)}" height="${rowH - 2}" fill="#d0ebff"/>`);
      if (on) parts.push(txt(cx + cw[pi] / 2, y + 16, one ? "●" : "○", { size: one ? 15 : 13, anchor: "middle", color: one ? C.blue : "#495057", bold: one }));
      cx += cw[pi];
    });
    parts.push(`<line x1="0" y1="${y + rowH}" x2="${total}" y2="${y + rowH}" stroke="#e9ecef"/>`);
  });
  const h = top + 24 + b.items.length * rowH;
  parts.push(`<rect x="0" y="${top}" width="${total}" height="${h - top}" fill="none" stroke="#adb5bd"/>`);
  parts.push(`<line x1="${labelW}" y1="${top}" x2="${labelW}" y2="${h}" stroke="#adb5bd"/>`);
  return left(parts.join(""), total, h);
}

type Option = { label: string; pos: number[]; text: string };
type Statement = { label: string; node: CNode };

/** Answer options are either arrangements (swept against the constraints) or statements such as C@Kala (counted). */
function readOptions(src: string, b: Board, w: BoardWords): { arrangements: Option[]; statements: Statement[] } {
  const out: Option[] = [];
  const statements: Statement[] = [];
  let n = 0;
  for (const line of src.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const lm = /^(\([^)]{1,4}\)|[\p{L}\p{N}]{1,2}[.)])\s+/u.exec(line);
    const label = lm ? lm[1] : `(${++n})`;
    if (lm) n++;
    const rest = lm ? line.slice(lm[0].length) : line;
    if (/[@=≠<>∉∈[{¬~]/u.test(rest)) {
      statements.push({ label, node: parseRule(rest, b, w) });
      continue;
    }
    const pos = new Array(b.items.length).fill(-1);
    const put = (name: string, p: number) => {
      const i = b.items.findIndex((x) => low(x) === low(name));
      if (i < 0) throw new Error(fill(w.badOption, { s: line }));
      pos[i] = pos[i] === -1 ? p : -2; // −2: placed twice
    };
    if (b.mode === "slots" && !rest.includes(":")) {
      const toks = rest.split(/[\s,]+/).filter(Boolean);
      if (toks.length > b.places.length) throw new Error(fill(w.badOption, { s: line }));
      toks.forEach((t, p) => /^[_—–-]+$/.test(t) || put(t, p));
    } else {
      for (const group of rest.split(/[|;]/).map((g) => g.trim()).filter(Boolean)) {
        const p = b.places
          .map((pl, pi) => ({ pi, n: pl.name }))
          .filter(({ n }) => low(group).startsWith(low(n)))
          .sort((a, c) => c.n.length - a.n.length)[0];
        if (!p) throw new Error(fill(w.badOption, { s: line }));
        const names = group.slice(p.n.length).replace(/^\s*[:：]/, "").split(/[\s,]+/).filter((t) => t && !/^[_—–-]+$/.test(t));
        names.forEach((nm) => put(nm, p.pi));
      }
    }
    out.push({ label, pos, text: rest });
  }
  return { arrangements: out, statements };
}

type Verdict = "must" | "never" | "could";

/** Each statement against every arrangement left: true in all, in none, or in some (and in exactly one: it fixes the board). */
function drawStatements(b: Board, st: Statement[], counts: number[], total: number, title: string, w: BoardWords): { svg: string; h: number; verdicts: Verdict[] } {
  const texts = st.map((s) => show(s.node, b));
  const labelW = Math.max(40, ...st.map((s) => tw(s.label, 13) + 14));
  const textW = Math.min(300, Math.max(120, ...texts.map((t) => tw(t, 13) + 16)));
  const countW = 70;
  const verdictW = Math.max(...[w.stMust, w.stNever, `${w.stCould} · ${w.stFixes}`].map((s) => tw(s, 12.5) + 20));
  const width = labelW + textW + countW + verdictW;
  const rowH = 24;
  const top = 22;
  const parts: string[] = [txt(0, 14, title, { size: 13, bold: true, color: "#495057" })];
  parts.push(`<rect x="0" y="${top}" width="${width}" height="${st.length * rowH}" fill="#ffffff"/>`);
  const verdicts: Verdict[] = [];
  st.forEach((s, i) => {
    const y = top + i * rowH;
    const k = counts[i];
    const v: Verdict = k === total ? "must" : k === 0 ? "never" : "could";
    verdicts.push(v);
    const bg = v === "must" ? GREEN_BG : v === "never" ? RED_BG : k === 1 ? "#d0ebff" : undefined;
    if (bg) parts.push(`<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${bg}"/>`);
    parts.push(txt(8, y + 16.5, s.label, { size: 13, bold: true }));
    parts.push(txt(labelW, y + 16.5, texts[i], { size: 13, bold: true }));
    parts.push(txt(labelW + textW + countW / 2, y + 16.5, `${k} / ${total}`, { size: 12.5, anchor: "middle", color: "#495057" }));
    const label = v === "must" ? w.stMust : v === "never" ? w.stNever : k === 1 && total > 1 ? `${w.stCould} · ${w.stFixes}` : w.stCould;
    parts.push(txt(labelW + textW + countW + 8, y + 16.5, label, { size: 12.5, bold: v !== "could" || k === 1, color: v === "must" ? C.green : v === "never" ? C.red : k === 1 ? C.blue : "#868e96" }));
    parts.push(`<line x1="0" y1="${y + rowH}" x2="${width}" y2="${y + rowH}" stroke="#e9ecef"/>`);
  });
  const h = top + st.length * rowH;
  parts.push(`<rect x="0" y="${top}" width="${width}" height="${h - top}" fill="none" stroke="#adb5bd"/>`);
  return { ...left(parts.join(""), width, h), verdicts };
}

function fitsCapacity(pos: number[], b: Board): boolean {
  if (pos.some((p) => p < 0)) return false;
  return b.places.every((pl, pi) => {
    const c = pos.filter((p) => p === pi).length;
    return c >= pl.min && c <= pl.max;
  });
}

function drawSweep(b: Board, opts: Option[], rules: CNode[], w: BoardWords): { svg: string; h: number; survivors: string[] } {
  const heads = [w.size, ...rules.map((_, i) => String(i + 1))];
  const labelW = Math.max(40, ...opts.map((o) => tw(o.label, 13) + 14));
  const textW = Math.min(300, Math.max(...opts.map((o) => tw(o.text, 12) + 16)));
  const colW = heads.map((h) => Math.max(30, tw(h, 12) + 12));
  const total = labelW + textW + colW.reduce((a, c) => a + c, 0) + 34;
  const rowH = 24;
  const parts: string[] = [txt(0, 14, w.sweep, { size: 13, bold: true, color: "#495057" })];
  const top = 22;
  parts.push(`<rect x="0" y="${top}" width="${total}" height="24" fill="#f1f3f5"/>`);
  let x = labelW + textW;
  heads.forEach((h, j) => {
    parts.push(txt(x + colW[j] / 2, top + 16, h, { size: 12, anchor: "middle", bold: true, color: "#495057" }));
    x += colW[j];
  });
  const survivors: string[] = [];
  opts.forEach((o, i) => {
    const y = top + 24 + i * rowH;
    const checks = [fitsCapacity(o.pos, b), ...rules.map((r) => holds(r, o.pos, b))];
    const kill = checks.indexOf(false);
    if (kill < 0) survivors.push(o.label);
    parts.push(`<rect x="0" y="${y}" width="${total}" height="${rowH}" fill="${kill < 0 ? GREEN_BG : "#ffffff"}"/>`);
    parts.push(txt(8, y + 16.5, o.label, { size: 13, bold: true }));
    let shown = o.text;
    while (tw(shown, 12) > textW - 12 && shown.length > 4) shown = shown.slice(0, -2);
    if (shown !== o.text) shown = shown.slice(0, -1) + "…";
    parts.push(txt(labelW, y + 16.5, shown, { size: 12, color: kill < 0 ? C.ink : "#868e96" }));
    let cx = labelW + textW;
    checks.forEach((ok, j) => {
      const mark = ok ? "·" : "✗";
      const color = ok ? "#adb5bd" : j === kill ? C.red : "#ced4da";
      parts.push(txt(cx + colW[j] / 2, y + 17, mark, { size: j === kill ? 16 : 14, anchor: "middle", bold: j === kill, color }));
      cx += colW[j];
    });
    if (kill < 0) parts.push(txt(cx + 17, y + 17, "✓", { size: 16, anchor: "middle", bold: true, color: C.green }));
    // The option is struck out by its first violated constraint.
    else parts.push(`<line x1="${labelW - 4}" y1="${y + 12}" x2="${labelW + Math.min(textW - 8, tw(shown, 12))}" y2="${y + 12}" stroke="${C.red}" stroke-width="1.2" opacity="0.6"/>`);
    parts.push(`<line x1="0" y1="${y + rowH}" x2="${total}" y2="${y + rowH}" stroke="#e9ecef"/>`);
  });
  const h = top + 24 + opts.length * rowH;
  parts.push(`<rect x="0" y="${top}" width="${total}" height="${h - top}" fill="none" stroke="#adb5bd"/>`);
  const f = left(parts.join(""), total, h);
  return { ...f, survivors };
}

export function renderBoard(spec: BoardSpec, words: LogicWords): RenderedSvg {
  const w = words.board;
  const b = readBoard(spec, w);
  const ruleSrc = spec.rules.split(/\n|;/).map((r) => r.trim()).filter(Boolean);
  const rules = ruleSrc.map((r) => parseRule(r, b, w));
  const s = solve(b, rules, w);
  const parts: string[] = [];
  let y = 0;
  const put = (d: { svg: string; h: number }, gap = 18) => {
    parts.push(`<g transform="translate(0 ${r2(y)})">${d.svg}</g>`);
    y += d.h + gap;
  };

  // The board with what is forced, and the pool.
  put(b.mode === "bins" ? drawBins(b, s, w) : drawSlots(b, s), 8);
  const forcedItems = new Set(b.items.filter((_, i) => s.count && s.possible[i].filter(Boolean).length === 1));
  // One text run per line, so the browser spaces the names; placed items are struck out.
  const poolLines: string[][] = [[]];
  let lineW = tw(w.pool, 13) + 16;
  for (const it of b.items) {
    const iw = tw(it, 14) + 14;
    if (lineW + iw > W - 48 && poolLines[poolLines.length - 1].length) (poolLines.push([]), (lineW = 0));
    poolLines[poolLines.length - 1].push(it);
    lineW += iw;
  }
  const poolSvg = poolLines
    .map((items, k) => {
      const runs = items
        .map((it) => (forcedItems.has(it) ? `<tspan fill="#adb5bd" text-decoration="line-through">${esc(it)}</tspan>` : `<tspan>${esc(it)}</tspan>`))
        .join("   ");
      const head = k === 0 ? `<tspan font-size="13" font-weight="400" fill="#495057">${esc(w.pool)}:  </tspan>` : "";
      return `<text x="24" y="${14 + k * 21}" ${FONT} font-size="14" font-weight="700" fill="${C.ink}" xml:space="preserve">${head}${runs}</text>`;
    })
    .join("");
  put({ svg: poolSvg, h: 20 + (poolLines.length - 1) * 21 });

  // The constraints, numbered, each conditional followed by its contrapositive.
  if (rules.length) {
    const lines: string[] = [txt(24, 14, w.constraints, { size: 13, bold: true, color: "#495057" })];
    let ly = 36;
    rules.forEach((r, i) => {
      lines.push(txt(24, ly, `${i + 1}.`, { size: 13, color: "#868e96" }));
      lines.push(txt(48, ly, show(r, b), { size: 14, bold: true }));
      ly += 21;
      if (r.t === "imp") {
        lines.push(txt(48, ly, `⇔ ${show({ t: "imp", a: negate(r.b), b: negate(r.a) }, b)}`, { size: 13, color: C.purple }));
        ly += 21;
      }
    });
    put({ svg: lines.join(""), h: ly - 8 });
  }

  // What the constraints allow.
  put(drawGrid(b, s, fill(w.grid, { n: s.count }) + "   " + w.legend));
  const caps: Caption[] = [];
  if (!s.count) caps.push({ text: w.none, color: C.red });
  else caps.push(s.count === 1 ? { text: w.unique, color: C.green } : { text: fill(w.many, { n: s.count }), color: C.blue });
  const forcedList = (sol: Solved) =>
    b.items.flatMap((it, i) => (sol.possible[i].filter(Boolean).length === 1 ? [`${it}@${b.places[sol.possible[i].indexOf(true)].name}`] : []));
  if (s.count) {
    const fl = forcedList(s);
    caps.push(fl.length ? { text: fill(w.forced, { list: fl.join(", ") }) } : { text: w.noneForced });
    // Places ruled out for items that are not yet placed: the free deductions.
    const out = b.items.flatMap((it, i) => {
      const left = s.possible[i].filter(Boolean).length;
      if (left <= 1 || left === b.places.length) return [];
      return b.places.flatMap((p, pi) => (s.possible[i][pi] ? [] : [`${it}∉${p.name}`]));
    });
    if (out.length && out.length <= 16) caps.push({ text: fill(w.ruledOut, { list: out.join(", ") }), color: "#495057" });
  }

  // An assumption, worked on a copy of the board.
  let working = rules;
  if (spec.ask.trim()) {
    const ask = parseRule(spec.ask, b, w);
    const x = show(ask, b);
    working = [...rules, ask];
    const sa = solve(b, working, w);
    if (!sa.count) caps.push({ text: fill(w.ifNone, { x }), color: C.red });
    else {
      put(drawGrid(b, sa, fill(w.gridIf, { x, n: sa.count }), s));
      const before = new Set(forcedList(s));
      const now = forcedList(sa).filter((f) => !before.has(f));
      caps.push(now.length ? { text: fill(w.ifSome, { x, n: sa.count, list: now.join(", ") }), color: C.purple } : { text: fill(w.ifNothingNew, { x, n: sa.count }), color: C.purple });
    }
  }

  // The sweep over the answer options.
  if (spec.options.trim()) {
    const { arrangements, statements } = readOptions(spec.options, b, w);
    if (arrangements.length) {
      const sw = drawSweep(b, arrangements, rules, w);
      put(sw);
      caps.push(sw.survivors.length ? { text: fill(w.survivors, { list: sw.survivors.join(", ") }), color: C.green } : { text: w.noSurvivor, color: C.red });
    }
    // Statements are judged on the board as it stands, including the assumption.
    if (statements.length) {
      const counts = statements.map(() => 0);
      const total = solve(b, working, w, (pos) => statements.forEach((st, i) => holds(st.node, pos, b) && counts[i]++)).count;
      const d = drawStatements(b, statements, counts, total, fill(w.statements, { n: total }), w);
      put(d);
      // Capitalise Latin and Cyrillic only: upper-case Georgian (Mtavruli) is missing from most fonts.
      const cap = (s: string) => (/^[a-zа-яё]/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s);
      const group = (v: Verdict) => statements.filter((_, i) => d.verdicts[i] === v).map((s) => s.label);
      const fixes = statements.filter((_, i) => counts[i] === 1 && total > 1).map((s) => s.label);
      if (group("must").length) caps.push({ text: `${cap(w.stMust)}: ${group("must").join(", ")}.`, color: C.green });
      if (group("never").length) caps.push({ text: `${cap(w.stNever)}: ${group("never").join(", ")}.`, color: C.red });
      if (fixes.length) caps.push({ text: `${cap(w.stFixes)}: ${fixes.join(", ")}.`, color: C.blue });
    }
  }
  if (rules.some((r) => r.t === "imp")) caps.push({ text: w.info, color: "#495057" });
  const title = b.mode === "bins" ? b.places.map((p) => p.name).join(" · ") : fill(w.slotsTitle, { s: b.places.length, n: b.items.length });
  return composeText(title, parts.join(""), y - 18, caps);
}

// ---------- truth-tellers and liars ----------

const KEYWORDS = new Set(["and", "or", "not", "xor", "nand", "nor", "implies", "iff", "true", "false"]);

export function renderKnights(src: string, words: LogicWords): RenderedSvg {
  const w = words.knights;
  const lines = src.split(/\n|;/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error(w.empty);
  // Every name becomes a variable x1, x2, … so that names may be whole words in any script.
  const vars = new Map<string, string>();
  const names = new Map<string, string>();
  const v = (name: string) => {
    const key = name.toLowerCase();
    if (!vars.has(key)) {
      const id = `x${vars.size + 1}`;
      vars.set(key, id);
      names.set(id, name);
    }
    return vars.get(key)!;
  };
  const speakers = new Set<string>();
  const stmts = lines.map((line) => {
    const m = /^([^:：]+?)\s*[:：]\s*(.+)$/u.exec(line);
    const body = m ? m[2] : line;
    if (m && !/^\p{L}[\p{L}\p{N}_]*$/u.test(m[1])) throw new Error(fill(w.badLine, { s: line }));
    const speaker = m ? v(m[1]) : undefined;
    if (speaker) speakers.add(speaker);
    const replaced = body.replace(/\p{L}[\p{L}\p{N}_]*/gu, (word) => (KEYWORDS.has(word.toLowerCase()) ? word : v(word)));
    return { speaker, node: parseFormula(replaced, words) };
  });
  const ids = [...names.keys()];
  // Speakers and capitalised names are islanders; a lowercase name (innocent, guilty) is a plain fact.
  const person = (id: string) => speakers.has(id) || /^\p{Lu}/u.test(names.get(id)!);
  if (ids.length > 6) throw new Error(fill(words.tooManyVars, { n: 6 }));
  const rows = rowsFor(ids, true);
  const nameTex = (id: string) => {
    const n = names.get(id)!;
    return /^[A-Za-z]$/.test(n) ? n : `\\text{${n}}`;
  };
  const tex = (n: Node) => toTexWith(n, (id, neg) => (neg ? "\\lnot " : "") + nameTex(id));
  const eqTex = (st: { speaker?: string; node: Node }) =>
    st.speaker ? `${nameTex(st.speaker)} \\leftrightarrow ${st.node.t === "bin" ? `\\left(${tex(st.node)}\\right)` : tex(st.node)}` : tex(st.node);
  const holdsRow = (st: { speaker?: string; node: Node }, e: Record<string, boolean>) => (st.speaker ? e[st.speaker] === evalNode(st.node, e) : evalNode(st.node, e));
  const ok = rows.map((e) => stmts.every((st) => holdsRow(st, e)));
  const cols: TCol[] = [
    ...ids.map((id): TCol => ({ tex: nameTex(id), kind: "var", vals: rows.map((e) => e[id]) })),
    ...stmts.map((st): TCol => ({ tex: eqTex(st), kind: "main", vals: rows.map((e) => holdsRow(st, e)) })),
  ];
  const body = truthTable(cols, ok.map((o) => (o ? GREEN_BG : undefined)), words, true, ok.map((o) => (o ? { text: "✓", color: C.green } : { text: "✗", color: "#ced4da" })));
  const k = ok.filter(Boolean).length;
  const describe = (e: Record<string, boolean>, which = ids) =>
    which.map((id) => `${names.get(id)}: ${person(id) ? (e[id] ? w.knight : w.knave) : e[id] ? w.isTrue : w.isFalse}`).join(", ");
  const caps: Caption[] = [];
  if (!k) caps.push({ text: w.none, color: C.red });
  else if (k === 1) caps.push({ text: fill(w.unique, { list: describe(rows[ok.indexOf(true)]) }), color: C.green });
  else {
    caps.push({ text: fill(w.many, { n: k }), color: C.blue });
    // What the statements settle anyway: the values shared by every consistent row.
    const good = rows.filter((_, r) => ok[r]);
    const settled = ids.filter((id) => good.every((e) => e[id] === good[0][id]));
    if (settled.length) caps.push({ text: fill(w.always, { list: describe(good[0], settled) }), color: C.green });
  }
  caps.push({ text: w.legend, color: "#495057" }, { text: w.info, color: "#495057" });
  const head = stmts.length === 1 ? eqTex(stmts[0]) : `\\begin{cases} ${stmts.map(eqTex).join(" \\\\ ")} \\end{cases}`;
  return compose(head, body.svg, body.h, caps);
}

// ---------- presets ----------

const board = (b: Partial<BoardSpec> & { places: string; pool: string }): LogicSpec => ({
  topic: "board",
  f: "",
  g: "",
  vals: "",
  tf: true,
  board: { mode: "bins", rules: "", ask: "", options: "", ...b },
});

// The 2025 NAEC master's exam, logical reasoning, variant I (items 12–14 and 15–17 share a scenario each).
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean).join("\n");
const NAEC_GROUPS = { places: "ჭველფი(3), კალა(3), ლატფარი(1)", pool: "A B C D E F G", rules: "A@ჭველფი\nC=G\nA≠B\nF@კალა → E@ჭველფი" };
const NAEC_SESSIONS = {
  mode: "slots" as const,
  places: "სამ-დილა სამ-საღამო ოთხ-დილა ოთხ-საღამო ხუთ-დილა ხუთ-საღამო პარ-დილა პარ-საღამო",
  pool: "აბასთუმანი ბორჯომი გრიგოლეთი თბილისი ნუნისი საირმე წყალტუბო ექსკურსია",
  rules: lines(`[აბასთუმანი·ბორჯომი]
    ნუნისი@ოთხ-დილა
    გრიგოლეთი ∉ დილა
    თბილისი ∉ დილა
    ბორჯომი < წყალტუბო
    ნუნისი < საირმე → გრიგოლეთი < ნუნისი`),
};
const NAEC_BOARDS: { label: string; spec: LogicSpec }[] = [
  {
    label: "NAEC 2025 · 12: which grouping?",
    spec: board({
      ...NAEC_GROUPS,
      options: lines(`(ა) ლატფარი: E | ჭველფი: A C G | კალა: B D F
        (ბ) ლატფარი: E | ჭველფი: B D F | კალა: A C G
        (გ) ლატფარი: F | ჭველფი: A B C | კალა: D G E
        (დ) ლატფარი: F | ჭველფი: A D E | კალა: B C G
        (ე) ლატფარი: F | ჭველფი: A C D | კალა: B E G`),
    }),
  },
  {
    label: "NAEC 2025 · 13: if A=F, must be false?",
    spec: board({ ...NAEC_GROUPS, ask: "A=F", options: "(ა) C@ჭველფი\n(ბ) E@ლატფარი\n(გ) D@კალა\n(დ) B@კალა\n(ე) E@ჭველფი" }),
  },
  {
    label: "NAEC 2025 · 14: which is sufficient?",
    spec: board({
      ...NAEC_GROUPS,
      options: lines(`(ა) A@ჭველფი ∧ E@ჭველფი
        (ბ) D@კალა ∧ E@კალა
        (გ) D@ჭველფი ∧ F@ჭველფი
        (დ) D@ჭველფი ∧ E@ჭველფი
        (ე) B@კალა ∧ G@კალა`),
    }),
  },
  {
    label: "NAEC 2025 · 15: which schedule?",
    spec: board({
      ...NAEC_SESSIONS,
      options: lines(`(ა) ექსკურსია თბილისი ნუნისი გრიგოლეთი აბასთუმანი ბორჯომი საირმე წყალტუბო
        (ბ) ექსკურსია გრიგოლეთი ნუნისი წყალტუბო საირმე თბილისი აბასთუმანი ბორჯომი
        (გ) გრიგოლეთი ექსკურსია ნუნისი საირმე აბასთუმანი ბორჯომი წყალტუბო თბილისი
        (დ) გრიგოლეთი საირმე ნუნისი აბასთუმანი ექსკურსია ბორჯომი წყალტუბო თბილისი
        (ე) საირმე ექსკურსია ნუნისი აბასთუმანი ბორჯომი თბილისი წყალტუბო გრიგოლეთი`),
    }),
  },
  {
    label: "NAEC 2025 · 16: excursion Thursday morning",
    spec: board({
      ...NAEC_SESSIONS,
      ask: "ექსკურსია@ხუთ-დილა",
      options: lines(`(ა) ბორჯომი@ხუთ-საღამო
        (ბ) გრიგოლეთი@სამ-საღამო
        (გ) თბილისი@ოთხ-საღამო
        (დ) საირმე@სამ-დილა
        (ე) წყალტუბო@პარ-დილა`),
    }),
  },
  {
    label: "NAEC 2025 · 17: Sairme Friday evening",
    spec: board({
      ...NAEC_SESSIONS,
      ask: "საირმე@პარ-საღამო",
      options: lines(`(ა) ექსკურსია@სამ-დილა
        (ბ) ექსკურსია@სამ-საღამო
        (გ) ექსკურსია@ხუთ-დილა
        (დ) ექსკურსია@ხუთ-საღამო
        (ე) ექსკურსია@პარ-დილა`),
    }),
  },
  {
    label: "NAEC 2025 · 8: seven statues",
    spec: board({
      mode: "slots",
      places: "7",
      pool: "აპოლონი ვენერა იუპიტერი კუპიდონი მერკური ნეპტუნი სატურნი",
      rules: lines(`იუპიტერი@1 ∨ იუპიტერი@7
        ნეპტუნი@5
        [სატურნი·ვენერა]
        ([კუპიდონი·აპოლონი] ∧ [აპოლონი·მერკური]) ∨ ([მერკური·აპოლონი] ∧ [აპოლონი·კუპიდონი])`),
      options: "(ა) სატურნი@3\n(ბ) მერკური@3\n(გ) კუპიდონი@3\n(დ) ვენერა@3\n(ე) აპოლონი@3",
    }),
  },
];

export const BOARD_PRESETS: { label: string; spec: LogicSpec }[] = [
  ...NAEC_BOARDS,
  {
    label: "Race: who finished where?",
    spec: board({
      mode: "slots",
      places: "5",
      pool: "Ana Beka Gio Dato Eka",
      rules: "Ana < Beka\n[Gio·Dato]\nEka ∉ 5\nBeka@2 → Eka@1\nGio < Eka",
      ask: "",
      options: "",
    }),
  },
  {
    label: "Committees with ranges",
    spec: board({
      places: "Red(1-3), Blue(1-3)",
      pool: "P Q R S T",
      rules: "P≠Q\nR@Red → S@Blue\nT=P",
      ask: "Q@Red",
      options: "",
    }),
  },
];

export const KNIGHTS_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "“We are both liars”", spec: { topic: "knights", f: "A: ~A & ~B", g: "", vals: "", tf: true } },
  { label: "“We are of the same kind”", spec: { topic: "knights", f: "A: ~B\nB: A <-> B", g: "", vals: "", tf: true } },
  { label: "Bibi's innocence", spec: { topic: "knights", f: "Bibi: ~Bibi | innocent", g: "", vals: "", tf: true } },
  // NAEC 2025, item 11: g = Bibi is guilty, c = the criminal is a truth-teller; Bibi says "a liar did it".
  { label: "NAEC 2025 · 11: “a liar did it”", spec: { topic: "knights", f: "Bibi: ~c\ng -> (c <-> Bibi)", g: "", vals: "", tf: true } },
  { label: "Three islanders", spec: { topic: "knights", f: "A: ~B\nB: ~C\nC: ~A & ~B", g: "", vals: "", tf: true } },
  { label: "No such island", spec: { topic: "knights", f: "A: B\nB: ~A", g: "", vals: "", tf: true } },
];
