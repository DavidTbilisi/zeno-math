// Practice: Logic. Easy gives P and Q their values and asks whether a statement made of them is true (an "if … then"
// with a false first part taken as false, or "or" taken as one but not both, named); medium works out a statement's
// whole column of the truth table, typed as 1s and 0s; hard picks the statement that means the same: the
// contrapositive, not the converse; De Morgan's laws; the negation of "if … then" (in symbols or in words).
import { fill } from "../chart";
import {
  column,
  EQUIVALENCES,
  esc,
  formulaTex,
  formulaText,
  option,
  partsOf,
  ROWS,
  shuffled,
  TABLE_FORMULAS,
  truth,
  VALUE_FORMULAS,
  type Equivalence,
  type Formula,
  type LogicWords,
  type Slip,
} from "../logicSets";
import type { Exercise, Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
const bit = (b: boolean) => (b ? 1 : 0);
const SLIP_MISTAKE = { vacuous: "vacuousTruth", exclusive: "exclusiveOr" } as const;
const SLIPS: readonly Slip[] = ["vacuous", "exclusive"];

/** Is the statement true when P and Q have these values? */
export function valuePart(f: Formula, p: boolean, q: boolean, w: PracticeWords): Part {
  const T = w.proofs;
  const v = truth(f, p, q);
  const options = [option(T.true), option(T.false)];
  const traps: Trap[] = [];
  for (const slip of SLIPS) {
    const s = truth(f, p, q, slip);
    if (s !== v && !traps.length) traps.push({ id: SLIP_MISTAKE[slip], a: { k: "pick", options, right: s ? 0 : 1 } });
  }
  const right = v ? 0 : 1;
  return {
    prompt: fill(w.logic.prompt.value, { p: p ? T.true : T.false, q: q ? T.true : T.false }),
    q: formulaTex(f),
    answer: { k: "pick", options, right, traps },
    show: `\\text{${options[right].text}}`,
    plain: options[right].plain,
    format: "pick",
    steps: [`P = ${bit(p)},\\ Q = ${bit(q)}`, ...partsOf(f).map((g) => `${formulaTex(g)} = ${bit(truth(g, p, q))}`)],
  };
}

/** A truth table with P and Q filled in and the statement's column to fill. */
function tablePic(f: Formula): Exercise["pic"] {
  const head = formulaText(f);
  const wide = Math.max(110, head.length * 9 + 24);
  const xs = [0, 44, 88, 88 + wide];
  const H = 26;
  const cell = (c: number, row: number, text: string, fillC: string, bold = false) =>
    `<rect x="${xs[c]}" y="${row * H}" width="${xs[c + 1] - xs[c]}" height="${H}" fill="${fillC}" stroke="#868e96"/>` +
    `<text x="${(xs[c] + xs[c + 1]) / 2}" y="${row * H + 18}" text-anchor="middle" font-size="14"${bold ? ' font-weight="700"' : ""} fill="#1e1e1e">${esc(text)}</text>`;
  let svg = cell(0, 0, "P", "#e7f5ff", true) + cell(1, 0, "Q", "#e7f5ff", true) + cell(2, 0, head, "#e7f5ff", true);
  ROWS.forEach(([p, q], i) => (svg += cell(0, i + 1, `${bit(p)}`, "#fff") + cell(1, i + 1, `${bit(q)}`, "#fff") + cell(2, i + 1, "?", "#fff3bf")));
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 5 * H + 2, w: xs[3] + 2 };
}

/** The statement's column, row by row from the top. */
export function tablePart(f: Formula, w: PracticeWords): Part {
  const col = column(f);
  const traps: Trap[] = [];
  for (const slip of SLIPS) {
    const c = column(f, slip);
    const same = (a: number[]) => a.every((v, i) => v === c[i]);
    if (!same(col) && !traps.some((t) => t.a.k === "tuple" && same(t.a.vs))) traps.push({ id: SLIP_MISTAKE[slip], a: { k: "tuple", vs: c, tol: 1e-9 } });
  }
  return {
    prompt: w.logic.prompt.table,
    q: formulaTex(f),
    pic: tablePic(f),
    answer: { k: "tuple", vs: col, tol: 1e-9, traps },
    show: col.join(",\\ "),
    plain: col.join(", "),
    format: "bits",
    steps: ROWS.map(([p, q], i) => `P = ${bit(p)},\\ Q = ${bit(q)}:\\ ${formulaTex(f)} = ${col[i]}`),
  };
}

/** The statement that means the same as one in symbols. */
export function samePart(e: Equivalence, r: Rng, w: PracticeWords): Part {
  const items = shuffled(r, [{ f: e.right, trap: undefined }, ...e.others]);
  const options = items.map((it) => option(formulaText(it.f), formulaTex(it.f)));
  const right = items.findIndex((it) => it.f === e.right);
  const traps: Trap[] = items.flatMap((it, i) => (it.trap ? [{ id: it.trap, a: { k: "pick" as const, options, right: i } }] : []));
  return {
    prompt: w.logic.prompt.same,
    q: formulaTex(e.given),
    answer: { k: "pick", options, right, traps },
    show: formulaTex(e.right),
    plain: options[right].plain,
    format: "pick",
    steps: [`${formulaTex(e.given)}:\\ ${column(e.given).join("\\,")}`, `${formulaTex(e.right)}:\\ ${column(e.right).join("\\,")}`],
  };
}

/** The statement that means the same as an "if … then" in words: its contrapositive, not its converse or inverse. */
export function saidPart(s: LogicWords["said"][number], r: Rng, w: PracticeWords): Part {
  const line = (a: string, b: string) => fill(w.logic.ifThen, { a, b });
  const items = shuffled(r, [
    { t: line(s.notQ, s.notP), right: true },
    { t: line(s.q, s.p), trap: "converseSlip" as const },
    { t: line(s.notP, s.notQ), trap: "converseSlip" as const },
    { t: line(s.p, s.notQ) },
  ]);
  const options = items.map((it) => option(it.t));
  const right = items.findIndex((it) => "right" in it);
  const traps: Trap[] = items.flatMap((it, i) => ("trap" in it && it.trap ? [{ id: it.trap, a: { k: "pick" as const, options, right: i } }] : []));
  return {
    prompt: fill(w.logic.prompt.sameSaid, { s: line(s.p, s.q) }),
    q: "",
    answer: { k: "pick", options, right, traps },
    show: `\\text{${options[right].text}}`,
    plain: options[right].plain,
    format: "pick",
    steps: ["P \\to Q \\ \\equiv\\ \\lnot Q \\to \\lnot P"],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return valuePart(r.pick(VALUE_FORMULAS), r.next() < 0.5, r.next() < 0.5, w);
  if (L === 2) return tablePart(r.pick(TABLE_FORMULAS), w);
  return r.next() < 0.6 ? samePart(r.pick(EQUIVALENCES), r, w) : saidPart(r.pick(w.logic.said), r, w);
};

export default gen;
