// Truth trees (semantic tableaux) for propositional logic. The tree starts from the premises and the negated
// conclusion (or just the given formulas) and breaks every compound formula into its parts: "and"-like formulas
// stack their parts on the same branch, "or"-like ones split the branch in two. A branch that holds a formula and
// its negation closes (✗); a branch with nothing left to break and no clash stays open (○), and its letters are a
// row of the truth table that makes every starting formula true. Stacking rules go before splitting ones, and a
// split that closes one side at once goes first, so trees stay small.
import { C, compose, esc, fill, FONT, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import { fit, parseFormula, texBox, toTex, toText, varsOf, type LogicSpec, type LogicWords, type Node } from "./logic";
import { tw } from "./logicPuzzles";

export type TreeWords = {
  premise: string;
  negated: string;
  given: string;
  none: string;
  tooBig: string;
  valid: string;
  invalid: string;
  tautology: string;
  notTautology: string;
  unsat: string;
  sat: string;
  free: string;
  count: string;
  legend: string;
};

type Tag = "premise" | "negated" | "given";
/** One line of the tree: its row (counted down each path), the formula, and where it came from. */
export type Line = { row: number; f: Node; from?: number; rule?: string; tag?: Tag; used?: boolean };
export type Branch = { lines: Line[]; kids: Branch[]; closed?: [number, number]; model?: Record<string, boolean> };

const not = (a: Node): Node => ({ t: "not", a });

/** How a formula breaks up: one list of parts stacks on the branch, two lists split it. Literals don't break. */
export function decompose(f: Node): { rule: string; parts: Node[][] } | undefined {
  if (f.t === "bin") {
    const { a, b } = f;
    switch (f.op) {
      case "and": return { rule: "∧", parts: [[a, b]] };
      case "or": return { rule: "∨", parts: [[a], [b]] };
      case "imp": return { rule: "→", parts: [[not(a)], [b]] };
      case "iff": return { rule: "↔", parts: [[a, b], [not(a), not(b)]] };
      case "xor": return { rule: "⊕", parts: [[a, not(b)], [not(a), b]] };
      case "nand": return { rule: "↑", parts: [[not(a)], [not(b)]] };
      case "nor": return { rule: "↓", parts: [[not(a), not(b)]] };
      case "diff": return { rule: "∖", parts: [[a, not(b)]] };
    }
  }
  if (f.t === "not" && f.a.t === "not") return { rule: "¬¬", parts: [[f.a.a]] };
  if (f.t === "not" && f.a.t === "bin") {
    const { a, b } = f.a;
    switch (f.a.op) {
      case "and": return { rule: "¬∧", parts: [[not(a)], [not(b)]] };
      case "or": return { rule: "¬∨", parts: [[not(a), not(b)]] };
      case "imp": return { rule: "¬→", parts: [[a, not(b)]] };
      case "iff": return { rule: "¬↔", parts: [[a, not(b)], [not(a), b]] };
      case "xor": return { rule: "¬⊕", parts: [[a, b], [not(a), not(b)]] };
      case "nand": return { rule: "¬↑", parts: [[a, b]] };
      case "nor": return { rule: "¬↓", parts: [[a], [b]] };
      case "diff": return { rule: "¬∖", parts: [[not(a)], [b]] };
    }
  }
  return undefined;
}

/** The rows of a clash the new line makes on this path: ⊥ or ¬⊤ alone, or a formula next to its negation. */
function clash(path: Line[], line: Line): [number, number] | undefined {
  const f = line.f;
  if ((f.t === "const" && !f.v) || (f.t === "not" && f.a.t === "const" && f.a.v)) return [line.row, line.row];
  const neg = f.t === "not" ? toText(f.a) : toText(not(f));
  const other = path.find((l) => l !== line && toText(l.f) === neg);
  return other && [other.row, line.row];
}

const MAX_LEAVES = 32;

/** Grows the whole tree from its first lines. */
export function growTree(start: { f: Node; tag: Tag }[], w: TreeWords): Branch {
  let leaves = 0;
  const leaf = () => {
    if (++leaves > MAX_LEAVES) throw new Error(fill(w.tooBig, { n: MAX_LEAVES }));
  };
  // Adds lines to the branch; true when one of them closes it.
  const extend = (b: Branch, path: Line[], todo: Line[], lines: Line[]) => {
    for (const line of lines) {
      b.lines.push(line);
      path.push(line);
      const c = clash(path, line);
      if (c) {
        b.closed = c;
        return true;
      }
      if (decompose(line.f)) todo.push(line);
    }
    return false;
  };
  const derive = (src: Line, parts: Node[], row: number, rule: string): Line[] => parts.map((f, i) => ({ row: row + 1 + i, f, from: src.row, rule }));
  const closesAtOnce = (path: Line[], parts: Node[]) => {
    const probe: Line[] = [...path];
    return parts.some((f) => {
      const line: Line = { row: 0, f };
      probe.push(line);
      return clash(probe, line) !== undefined;
    });
  };
  const grow = (b: Branch, path: Line[], todo: Line[], row: number): void => {
    for (;;) {
      if (!todo.length) {
        b.model = {};
        for (const l of path) {
          if (l.f.t === "var") b.model[l.f.name] = true;
          else if (l.f.t === "not" && l.f.a.t === "var") b.model[l.f.a.name] = false;
        }
        return leaf();
      }
      const ways = todo.map((l) => ({ l, d: decompose(l.f)! }));
      const pick = ways.find((x) => x.d.parts.length === 1) ?? ways.find((x) => x.d.parts.some((p) => closesAtOnce(path, p))) ?? ways[0];
      todo.splice(todo.indexOf(pick.l), 1);
      pick.l.used = true;
      if (pick.d.parts.length === 1) {
        const lines = derive(pick.l, pick.d.parts[0], row, pick.d.rule);
        row += lines.length;
        if (extend(b, path, todo, lines)) return leaf();
        continue;
      }
      for (const part of pick.d.parts) {
        const kid: Branch = { lines: [], kids: [] };
        b.kids.push(kid);
        const lines = derive(pick.l, part, row, pick.d.rule);
        const kidPath = [...path];
        const kidTodo = [...todo];
        if (extend(kid, kidPath, kidTodo, lines)) leaf();
        else grow(kid, kidPath, kidTodo, row + lines.length);
      }
      return;
    }
  };
  const root: Branch = { lines: [], kids: [] };
  const path: Line[] = [];
  const todo: Line[] = [];
  if (extend(root, path, todo, start.map((s, i) => ({ row: i + 1, f: s.f, tag: s.tag })))) leaf();
  else grow(root, path, todo, start.length);
  return root;
}

/** The leaves, left to right. */
export const leavesOf = (b: Branch): Branch[] => (b.kids.length ? b.kids.flatMap(leavesOf) : [b]);

// ---------- drawing ----------

const ROW_H = 30;
const SPLIT_H = 26;
const GAP = 22;
const SIDE = 13; // font size of row numbers and justifications

type Placed = { b: Branch; w: number; half: number; boxes: ReturnType<typeof texBox>[]; notes: string[]; leafText?: string; kids: Placed[] };

function measure(b: Branch, words: TreeWords, modelText: (m: Record<string, boolean>) => string): Placed {
  const boxes = b.lines.map((l) => texBox(toTex(l.f), 0.9));
  const notes = b.lines.map((l) => (l.tag ? words[l.tag] : `${l.from} ${l.rule}`));
  let half = 30;
  b.lines.forEach((l, i) => {
    const side = Math.max(tw(String(l.row), SIDE) + 8, tw(notes[i], SIDE - 1) + (l.used ? 20 : 8));
    half = Math.max(half, boxes[i].w / 2 + side + 6);
  });
  const leafText = b.model && modelText(b.model);
  if (leafText) half = Math.max(half, tw(leafText, 13) / 2 + 8);
  const kids = b.kids.map((k) => measure(k, words, modelText));
  const kidsW = kids.reduce((a, k) => a + k.w, 0) + GAP * Math.max(0, kids.length - 1);
  return { b, w: Math.max(2 * half, kidsW), half, boxes, notes, leafText, kids };
}

function draw(p: Placed, x0: number, y0: number, out: string[]): number {
  const cx = x0 + p.w / 2;
  let y = y0;
  p.b.lines.forEach((l, i) => {
    const yc = y + ROW_H / 2;
    const box = p.boxes[i];
    const hit = p.b.closed && (l.row === p.b.closed[0] || l.row === p.b.closed[1]);
    out.push(box.at(cx, yc));
    if (hit) out.push(`<rect x="${r2(cx - box.w / 2 - 4)}" y="${r2(yc - box.h / 2 - 2)}" width="${r2(box.w + 8)}" height="${r2(box.h + 4)}" rx="4" fill="none" stroke="${C.red}" stroke-width="1.2"/>`);
    out.push(`<text x="${r2(cx - box.w / 2 - 10)}" y="${r2(yc + 4)}" text-anchor="end" ${FONT} font-size="${SIDE}" fill="${C.grey}">${l.row}</text>`);
    let nx = cx + box.w / 2 + 10;
    if (l.used) {
      out.push(`<text x="${r2(nx)}" y="${r2(yc + 4)}" ${FONT} font-size="${SIDE}" font-weight="700" fill="${C.green}">✓</text>`);
      nx += 14;
    }
    out.push(`<text x="${r2(nx)}" y="${r2(yc + 4)}" ${FONT} font-size="${SIDE - 1}" fill="${C.grey}">${esc(p.notes[i])}</text>`);
    y += ROW_H;
  });
  if (p.b.closed) {
    const [i, j] = p.b.closed;
    out.push(`<text x="${r2(cx)}" y="${r2(y + 16)}" text-anchor="middle" ${FONT} font-size="18" font-weight="700" fill="${C.red}">✗</text>`);
    out.push(`<text x="${r2(cx + 10)}" y="${r2(y + 15)}" ${FONT} font-size="${SIDE - 1}" fill="${C.red}">${i === j ? i : `${i}, ${j}`}</text>`);
    return y + 24;
  }
  if (p.leafText !== undefined) {
    out.push(`<circle cx="${r2(cx)}" cy="${r2(y + 10)}" r="7" fill="none" stroke="${C.green}" stroke-width="2"/>`);
    out.push(`<text x="${r2(cx)}" y="${r2(y + 36)}" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="${C.green}">${esc(p.leafText)}</text>`);
    return y + 44;
  }
  let x = x0 + (p.w - (p.kids.reduce((a, k) => a + k.w, 0) + GAP * (p.kids.length - 1))) / 2;
  let bottom = y;
  for (const k of p.kids) {
    const kx = x + k.w / 2;
    out.push(`<line x1="${r2(cx)}" y1="${r2(y + 2)}" x2="${r2(kx)}" y2="${r2(y + SPLIT_H - 2)}" stroke="${C.grey}" stroke-width="1.4"/>`);
    bottom = Math.max(bottom, draw(k, x, y + SPLIT_H, out));
    x += k.w + GAP;
  }
  return bottom;
}

// ---------- the tool ----------

export function renderTree(spec: LogicSpec, lw: LogicWords): RenderedSvg {
  const w = lw.tree;
  const prem = spec.f.split(/[;,\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => parseFormula(s, lw));
  const concl = spec.g.trim() ? parseFormula(spec.g, lw) : undefined;
  if (!prem.length && !concl) throw new Error(w.none);
  const start = [...prem.map((f) => ({ f, tag: (concl ? "premise" : "given") as Tag })), ...(concl ? [{ f: not(concl), tag: "negated" as Tag }] : [])];
  const vars = varsOf(start.map((s) => s.f));
  const value = (v: boolean) => (spec.tf ? (v ? lw.T : lw.F) : v ? "1" : "0");
  const name = (v: string) => toText({ t: "var", name: v });
  const modelText = (m: Record<string, boolean>) => {
    const set = vars.filter((v) => v in m);
    const free = vars.filter((v) => !(v in m));
    // No-break spaces keep each "p = T" on one line when the caption wraps.
    const row = set.map((v) => `${name(v)}\u00a0=\u00a0${value(m[v])}`).join(", ");
    return free.length ? `${row}${row ? "; " : ""}${fill(w.free, { vars: free.map(name).join(", ") })}` : row;
  };

  const tree = growTree(start, w);
  const leaves = leavesOf(tree);
  const open = leaves.filter((l) => !l.closed);
  const placed = measure(tree, w, modelText);
  const out: string[] = [];
  const h = draw(placed, 0, 0, out);
  const body = fit(out.join(""), placed.w, h, W - 24, 1.2);

  const caps: Caption[] = [];
  const row = open.length ? modelText(open[0].model!) : "";
  const k = { k: open.length, n: leaves.length, row };
  if (concl && !prem.length) caps.push(open.length ? { text: fill(w.notTautology, k), color: C.red } : { text: w.tautology, color: C.green });
  else if (concl) caps.push(open.length ? { text: fill(w.invalid, k), color: C.red } : { text: w.valid, color: C.green });
  else caps.push(open.length ? { text: fill(w.sat, k), color: C.green } : { text: w.unsat, color: C.red });
  caps.push({ text: fill(w.count, { closed: leaves.length - open.length, n: leaves.length }), color: C.grey });
  caps.push({ text: w.legend, color: C.grey });

  const premTex = prem.map((f) => toTex(f)).join(",\\; ");
  const head = concl ? `${premTex}${prem.length ? "\\;" : ""}${open.length ? "\\nvDash" : "\\vDash"}\\; ${toTex(concl)}` : premTex;
  return compose(head, body.svg, body.h, caps);
}

const tr = (f: string, g = ""): LogicSpec => ({ topic: "tree", f, g, vals: "", tf: true });

export const TREE_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "Modus ponens", spec: tr("p -> q; p", "q") },
  { label: "Affirming the consequent", spec: tr("p -> q; q", "p") },
  { label: "Chain", spec: tr("p -> q; q -> r", "p -> r") },
  { label: "Constructive dilemma", spec: tr("p -> q; r -> s; p | r", "q | s") },
  { label: "De Morgan is a tautology", spec: tr("", "~(p & q) <-> (~p | ~q)") },
  { label: "Peirce's law", spec: tr("", "((p -> q) -> p) -> p") },
  { label: "p → q is not a tautology", spec: tr("", "p -> q") },
  { label: "Can these all be true?", spec: tr("p | q; ~p | r; ~q") },
  { label: "A contradiction", spec: tr("p <-> q; q <-> ~p") },
  // NAEC 2025, variant I, item 7.
  { label: "NAEC 2025 · 7", spec: tr("s -> (a -> z); b -> ~z", "s -> (a -> ~b)") },
];
