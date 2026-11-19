// Practice: Repeating patterns. A row of shapes or colours repeating a unit (src/math/rowsAndPatterns.ts): what comes
// next, how long the repeating part is, which is the 13th or the 40th, found by the remainder.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { HEX, itemAt, ordinalText, patternQuestion, SYMBOL, TEX, type Item, type PatternQuestion, type RowWords } from "../rowsAndPatterns";
import { rowPic } from "./ordinals";

/** A choice of item: by shape, its symbol and name; by colour, a dot and the colour's name. */
const itemOption = (it: Item, by: PatternQuestion["by"], W: RowWords) =>
  by === "shape"
    ? { text: `${SYMBOL[it.shape]} ${W.shapes[it.shape]}`, plain: W.shapes[it.shape], tex: `\\color{${HEX[it.colour]}}{${TEX[it.shape]}}` }
    : { text: `● ${W.colours[it.colour]}`, plain: W.colours[it.colour], tex: `\\color{${HEX[it.colour]}}{${TEX.circle}}` };
const sameAs = (a: Item, b: Item) => a.shape === b.shape && a.colour === b.colour;

export function patternPart(q: PatternQuestion, W: RowWords): Part {
  const row = Array.from({ length: q.shown }, (_, i) => itemAt(q.unit, i + 1));
  const unitTex = q.unit.map((it) => itemOption(it, q.by, W).tex).join("\\,");
  if (q.kind === "length") {
    return {
      prompt: W.length,
      q: "",
      pic: rowPic(row),
      answer: { ...num(q.v), traps: q.trap ? [{ id: q.trap.id, a: num(q.trap.v), vars: { x: q.trap.v, v: q.v } }] : [] },
      show: String(q.v),
      plain: String(q.v),
      format: "number",
      steps: [`${unitTex} \\;\\big|\\; ${unitTex}: ${q.v}`],
    };
  }
  // The place asked about: a box with a question mark, straight after the row or after a gap.
  const gap = q.kind === "nth";
  const box = (x: number) =>
    `${gap ? `<text x="${x + 6}" y="25" font-size="18" fill="#868e96">…</text>` : ""}<rect x="${x + (gap ? 30 : 2)}" y="3" width="30" height="30" rx="4" fill="none" stroke="#868e96" stroke-width="2" stroke-dasharray="4 3"/><text x="${x + (gap ? 45 : 17)}" y="25" font-size="18" text-anchor="middle" fill="#868e96">?</text>${gap ? `<text x="${x + 45}" y="48" font-size="12" text-anchor="middle" fill="#495057">${q.n}</text>` : ""}`;
  const options = q.options.map((it) => itemOption(it, q.by, W));
  const right = q.options.findIndex((it) => sameAs(it, q.right!));
  const traps: Trap[] = q.trap?.item ? [{ id: q.trap.id, a: { k: "pick", options, right: q.options.findIndex((it) => sameAs(it, q.trap!.item!)) }, vars: { x: options[q.options.findIndex((it) => sameAs(it, q.trap!.item!))].plain, v: options[right].plain, n: q.n, u: q.unit.length } }] : [];
  const u = q.unit.length;
  const rest = q.n % u || u;
  const steps =
    q.kind === "next" ? [`${unitTex} \\;\\big|\\; ${unitTex} \\;\\big|\\; \\ldots ${options[right].tex}`]
    : [`${q.n} = ${Math.floor((q.n - 1) / u)} \\times ${u} + ${rest}`, `${rest}: ${options[right].tex}`];
  return {
    prompt: q.kind === "next" ? W.next : fill(W.nth, { nth: ordinalText(q.n, W.ordinal) }),
    q: "",
    pic: { ...rowPic(row, { extra: box, extraW: gap ? 80 : 40 }), h: gap ? 54 : 40 },
    answer: { k: "pick", options, right, traps },
    show: options[right].tex,
    plain: options[right].plain,
    format: "pick",
    steps,
  };
}

const gen: Gen = (r, L, w) => patternPart(patternQuestion(L, r.next), w.rows);

export default gen;
