// Practice: Ordinal numbers. A row of shapes (src/math/rowsAndPatterns.ts): which is 4th from the left, the position of
// the one under the arrow counted from the left or the right, the one just before or after the 7th.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { HEX, ordinalQuestion, ordinalText, SYMBOL, TEX, type Item, type OrdinalQuestion, type RowWords, type Shape } from "../rowsAndPatterns";

const CELL = 40;
const ORDINAL_ENDS = ["st", "nd", "rd", "th", "-я", "-й", "-ая", "-ий"];

/** One shape drawn in a 30 by 30 box at (x, y). */
export function shapeSvg(it: Item, x: number, y: number): string {
  const c = HEX[it.colour];
  const [cx, cy] = [x + 15, y + 15];
  switch (it.shape) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="13" fill="${c}"/>`;
    case "square":
      return `<rect x="${x + 3}" y="${y + 3}" width="24" height="24" fill="${c}"/>`;
    case "triangle":
      return `<polygon points="${cx},${y + 2} ${x + 28},${y + 27} ${x + 2},${y + 27}" fill="${c}"/>`;
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 6 : 14;
        const t = (Math.PI * i) / 5 - Math.PI / 2;
        return `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + 1 + r * Math.sin(t)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(" ")}" fill="${c}"/>`;
    }
    case "heart":
      return `<path d="M${cx},${y + 27} C${x + 2},${y + 16} ${x + 2},${y + 4} ${cx - 7},${y + 5} C${cx - 3},${y + 5} ${cx},${y + 8} ${cx},${y + 11} C${cx},${y + 8} ${cx + 3},${y + 5} ${cx + 7},${y + 5} C${x + 28},${y + 4} ${x + 28},${y + 16} ${cx},${y + 27} Z" fill="${c}"/>`;
    case "diamond":
      return `<polygon points="${cx},${y + 1} ${x + 26},${cy} ${cx},${y + 29} ${x + 4},${cy}" fill="${c}"/>`;
  }
}
/** A row of items, an arrow over one of them if `arrow` is set, and anything else drawn after it. */
export function rowPic(row: Item[], o: { arrow?: number; extra?: (x: number) => string; extraW?: number } = {}) {
  const w = row.length * CELL + (o.extraW ?? 0);
  const top = o.arrow !== undefined ? 22 : 4;
  const shapes = row.map((it, i) => shapeSvg(it, 5 + i * CELL, top)).join("");
  const arrow = o.arrow !== undefined ? `<path d="M${20 + o.arrow * CELL},18 l-6,-10 h12 z" fill="#1e1e1e"/>` : "";
  const svg = shapes + arrow + (o.extra ? o.extra(5 + row.length * CELL) : "");
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: top + 34, w };
}
/** A choice of shape: its symbol and name to tap, its name to type, its coloured symbol for the working. */
export const shapeOption = (s: Shape, W: RowWords, it: Item = { shape: s, colour: "red" }) => ({ text: `${SYMBOL[s]} ${W.shapes[s]}`, plain: W.shapes[s], tex: `\\color{${HEX[it.colour]}}{${TEX[s]}}` });

export function ordinalPart(q: OrdinalQuestion, W: RowWords): Part {
  const nth = (n: number) => ordinalText(n, W.ordinal);
  if (q.kind === "position") {
    const len = q.row.length;
    return {
      prompt: fill(W.position, { side: W.side[q.side] }),
      q: "",
      pic: rowPic(q.row, { arrow: q.at }),
      // A position may be written as an ordinal: 3rd, 3-я.
      answer: { k: "num", v: q.v, tol: 1e-9, units: ORDINAL_ENDS, traps: [{ id: q.trap.id, a: num(q.trap.v), vars: { x: q.trap.v, len, v: q.v } }] },
      show: String(q.v),
      plain: String(q.v),
      format: "number",
      steps: [`${len} + 1 - ${q.trap.v} = ${q.v}`],
    };
  }
  const colourOf = (s: Shape) => q.row.find((x) => x.shape === s) ?? { shape: s, colour: "red" as const };
  const options = q.options.map((s) => shapeOption(s, W, colourOf(s)));
  const at = (s: Shape) => q.options.indexOf(s);
  const traps: Trap[] = q.trap ? [{ id: q.trap.id, a: { k: "pick", options, right: at(q.trap.shape) }, vars: { x: W.shapes[q.trap.shape], v: W.shapes[q.right] } }] : [];
  const prompt =
    q.kind === "which" ? fill(W.which, { nth: nth(q.n), side: W.side[q.side] })
    : fill(q.dir === "before" ? W.before : W.after, { nth: nth(q.n), side: W.side[q.side] });
  const m = q.kind === "beside" ? (q.dir === "before" ? q.n - 1 : q.n + 1) : q.n;
  return {
    prompt,
    q: "",
    pic: rowPic(q.row),
    answer: { k: "pick", options, right: at(q.right), traps },
    show: options[at(q.right)].tex,
    plain: options[at(q.right)].plain,
    format: "pick",
    steps: [`${m}: ${options[at(q.right)].tex}`],
  };
}

const gen: Gen = (r, L, w) => ordinalPart(ordinalQuestion(L, r.next), w.rows);

export default gen;
