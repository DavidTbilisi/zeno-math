// Practice: Lines of symmetry. #713 added letters drawn in squares at the medium level, and at the hard level a new
// setting: a pattern of squares on a grid, finished so that the dashed line is a mirror. A half turn taken for a fold,
// only one side's squares mirrored and squares that already have their partner counted are the slips.
import { fill, r2 } from "../chart";
import { falseDiagonals, mirrorsOf, symSvg, symTask } from "../symmetry";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

/** Letters drawn in squares, row by row from the top. */
const LETTERS: Record<string, string[]> = {
  A: [" ## ", "#  #", "####", "#  #", "#  #"],
  B: ["## ", "# #", "## ", "# #", "## "],
  C: ["###", "#  ", "#  ", "#  ", "###"],
  E: ["###", "#  ", "###", "#  ", "###"],
  F: ["###", "#  ", "## ", "#  ", "#  "],
  H: ["# #", "# #", "###", "# #", "# #"],
  I: ["###", " # ", " # ", " # ", "###"],
  L: ["#  ", "#  ", "#  ", "#  ", "###"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: ["###", "# #", "# #", "# #", "###"],
  P: ["## ", "# #", "## ", "#  ", "#  "],
  S: ["###", "#  ", "###", "  #", "###"],
  T: ["###", " # ", " # ", " # ", " # "],
  U: ["# #", "# #", "# #", "# #", "###"],
  V: ["# #", "# #", "# #", "# #", " # "],
  Y: ["# #", "# #", " # ", " # ", " # "],
  Z: ["###", "  #", " # ", "#  ", "###"],
};
const rev = (s: string) => [...s].reverse().join("");
/** A letter's mirror lines (up and down, across) and whether a half turn fits it onto itself. */
export function letterSym(rows: string[]): { lines: number; half: boolean } {
  const ud = rows.every((row) => row === rev(row));
  const ac = rows.every((row, k) => row === rows[rows.length - 1 - k]);
  const half = rows.every((row, k) => row === rev(rows[rows.length - 1 - k]));
  return { lines: +ud + +ac, half };
}
/** Squares on a grid: `cells` shaded, a mirror dashed after column `vx` or row `hy`. */
function cellsPic(cols: number, rows: number, cells: [number, number][], o: { vx?: number; hy?: number } = {}): Part["pic"] {
  const u = 26;
  const [w, h] = [cols * u + 20, rows * u + 20];
  let body = "";
  for (let i = 0; i <= cols; i++) body += `<line x1="${10 + i * u}" y1="10" x2="${10 + i * u}" y2="${10 + rows * u}" stroke="#ced4da" stroke-width="1"/>`;
  for (let j = 0; j <= rows; j++) body += `<line x1="10" y1="${10 + j * u}" x2="${10 + cols * u}" y2="${10 + j * u}" stroke="#ced4da" stroke-width="1"/>`;
  for (const [c, rr] of cells) body += `<rect x="${10 + c * u}" y="${10 + rr * u}" width="${u}" height="${u}" fill="#4dabf7" stroke="#1971c2" stroke-width="1.5"/>`;
  if (o.vx !== undefined) body += `<line x1="${10 + o.vx * u}" y1="2" x2="${10 + o.vx * u}" y2="${h - 2}" stroke="#e03131" stroke-width="3" stroke-dasharray="8 5"/>`;
  if (o.hy !== undefined) body += `<line x1="2" y1="${10 + o.hy * u}" x2="${w - 2}" y2="${10 + o.hy * u}" stroke="#e03131" stroke-width="3" stroke-dasharray="8 5"/>`;
  return { svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, w, h };
}

/** The kinds #713 added: a letter's lines of symmetry (medium), finishing a pattern (hard). */
function more(r: Rng, L: 2 | 3, w: PracticeWords): Part {
  const A = w.movP;
  const number = (prompt: string, v: number, traps: Trap[], steps: string[], pic: Part["pic"]): Part => ({ prompt, q: "", pic, answer: { ...num(v), traps: traps.filter((t) => (t.a as { v: number }).v !== v) }, show: String(v), plain: String(v), format: "number", steps });
  if (L === 2) {
    const l = r.pick(Object.keys(LETTERS));
    const rows = LETTERS[l];
    const { lines, half } = letterSym(rows);
    const cells: [number, number][] = rows.flatMap((row, j) => [...row].flatMap((ch, i) => (ch === "#" ? [[i, j] as [number, number]] : [])));
    const traps: Trap[] = half && !lines ? [{ id: "turnNotFold", a: num(1), vars: { x: 1, l, v: 0 } }] : [];
    return number(fill(A.letter, { l }), lines, traps, [`\\text{${l}}: ${lines}`], cellsPic(rows[0].length, rows.length, cells));
  }
  // A pattern to finish: a squares on one side with no partner, b on the other, m pairs already matched.
  const across = r.next() < 0.5;
  const [half, long] = [3, 5];
  const pick = (n: number, avoid: Set<string>) => {
    const out: [number, number][] = [];
    while (out.length < n) {
      const c: [number, number] = [r.int(0, half - 1), r.int(0, long - 1)];
      const k = c.join();
      if (!avoid.has(k)) avoid.add(k), out.push(c);
    }
    return out;
  };
  const used = new Set<string>();
  const a = r.int(2, 4);
  const b = r.int(0, 2);
  const m = r.int(1, 3);
  const left = pick(a, used);
  const right = pick(b, used);
  const pairs = pick(m, used);
  // In (side, along) form: side 0..2 is the near half; its mirror is 5 − side.
  const mir = ([s, t]: [number, number]): [number, number] => [2 * half - 1 - s, t];
  const all: [number, number][] = [...left, ...right.map(mir), ...pairs, ...pairs.map(mir)];
  const cells = all.map(([s, t]) => (across ? [s, t] : [t, s]) as [number, number]);
  const v = a + b;
  const traps: Trap[] = [];
  if (b) traps.push({ id: "oneSideMirrored", a: num(a), vars: { x: a, a, b, v } });
  traps.push({ id: "matchedCounted", a: num(a + b + m), vars: { x: a + b + m, m, v } });
  const pic = across ? cellsPic(2 * half, long, cells, { vx: half }) : cellsPic(long, 2 * half, cells, { hy: half });
  return number(A.finish, v, traps, [`${a} + ${b} = ${v}`], pic);
}

const gen: Gen = (r, L, w) => {
  if (L === 2 && r.int(0, 9) >= 7) return more(r, 2, w);
  if (L === 3 && r.int(0, 9) >= 6) return more(r, 3, w);
  return old(r, L, w);
};

/** The shapes the skill had before #713. */
const old: Gen = (r, L, w) => {
  // How many lines a shape folds onto itself along (src/math/symmetry.ts); a quadrilateral's diagonals that only
  // halve it, counted as well, are the slip named.
  const t = symTask(L, r.next);
  const n = mirrorsOf(t).length;
  const extra = falseDiagonals(t);
  const pic = symSvg(t, 220);
  return {
    prompt: w.prompts.symmetryLines,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(n), traps: extra ? [{ id: "diagonalMirror", a: num(n + extra), vars: { v: n } }] : [] },
    show: String(n),
    plain: String(n),
    format: "number",
    solution: { kind: "mirror", spec: { task: t, steps: [] } },
  };
};

export default gen;
