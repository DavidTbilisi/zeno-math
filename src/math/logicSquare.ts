// The square of opposition: one categorical statement, given true or false, and what follows for the other three
// on the same terms (A all, E no, I some, O some not), each corner true, false or open with the link that settles it
// — contradictories, contraries, subcontraries, subalterns. Read the modern way, where a term may be empty, only the
// diagonals survive. Under the square, the immediate inferences: converse, obverse and contrapositive, and the
// weaker statement that follows "by limitation" when the full one doesn't. Every verdict comes from the Venn
// regions of the two terms, not from a table of rules.
import { txt } from "./algoArrays";
import { C, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import type { LogicSpec } from "./logic";
import { composeText, tw } from "./logicPuzzles";
import { parseStatement, type Form, type SylWords } from "./logicSyllogism";

export type SquareWords = {
  none: string;
  title: string;
  given: string;
  values: { true: string; false: string; open: string };
  links: { contradictories: string; contraries: string; subcontraries: string; subalterns: string };
  contra: string;
  contraryFalse: string;
  contraryOpen: string;
  subcontraryTrue: string;
  subcontraryOpen: string;
  downTrue: string;
  downOpen: string;
  upFalse: string;
  upOpen: string;
  modernLost: string;
  aristotle: string;
  modern: string;
  inferences: string;
  converse: string;
  obverse: string;
  contrapositive: string;
  limitation: string;
  non: string;
  letters: { s: string; p: string };
};

// ---------- the two terms' regions ----------

/** A term is S or P, or its complement. */
type Term = { base: 0 | 1; neg: boolean };
/** A statement on the two terms. */
type St = { form: Form; s: Term; p: Term };
export type Value = "true" | "false" | "open";

/** The regions inside a term, of four: 0 S and P, 1 S not P, 2 P not S, 3 neither. */
const inside = (t: Term): number[] => {
  const base = t.base === 0 ? [0, 1] : [0, 2];
  return t.neg ? [0, 1, 2, 3].filter((r) => !base.includes(r)) : base;
};
/** A model says which regions have something in them (bit r). */
const some = (model: number, regions: number[]) => regions.some((r) => (model >> r) & 1);

function holds(st: St, model: number): boolean {
  const both = inside(st.s).filter((r) => inside(st.p).includes(r));
  const outside = inside(st.s).filter((r) => !inside(st.p).includes(r));
  switch (st.form) {
    case "A":
      return !some(model, outside);
    case "E":
      return !some(model, both);
    case "I":
      return some(model, both);
    case "O":
      return some(model, outside);
  }
}

/** Every model, or, read as Aristotle did, those where no term and no complement is empty. */
const models = (aristotle: boolean) =>
  Array.from({ length: 16 }, (_, m) => m).filter((m) => !aristotle || [[0, 1], [2, 3], [0, 2], [1, 3]].every((rs) => some(m, rs)));

/** What `target` must be, in every model where `given` has the value given. */
export function valueOf(given: St, value: boolean, target: St, aristotle: boolean): Value {
  const vs = models(aristotle).filter((m) => holds(given, m) === value).map((m) => holds(target, m));
  return vs.every(Boolean) ? "true" : vs.some(Boolean) ? "open" : "false";
}

// ---------- the square ----------

const FORMS: Form[] = ["A", "E", "I", "O"];
const UNIVERSAL = (f: Form) => f === "A" || f === "E";
type Link = "contradictories" | "contraries" | "subcontraries" | "subalterns";
const linkOf = (a: Form, b: Form): Link =>
  (a === "A" && b === "O") || (a === "O" && b === "A") || (a === "E" && b === "I") || (a === "I" && b === "E")
    ? "contradictories"
    : UNIVERSAL(a) && UNIVERSAL(b)
      ? "contraries"
      : !UNIVERSAL(a) && !UNIVERSAL(b)
        ? "subcontraries"
        : "subalterns";

export type Corner = { form: Form; value: Value; text: string; why?: string };

/** The statement typed, or a bare letter A, E, I or O on the terms S and P. */
function read(src: string, sw: SylWords, w: SquareWords): { form: Form; s: string; p: string } {
  const t = src.trim();
  if (!t) throw new Error(w.none);
  if (/^[AEIO]$/i.test(t)) return { form: t.toUpperCase() as Form, s: w.letters.s, p: w.letters.p };
  const st = parseStatement(t, sw);
  return { form: st.form, s: st.s, p: st.p };
}

export function squareOf(spec: LogicSpec, sw: SylWords, w: SquareWords): { corners: Corner[]; given: Form; s: string; p: string; value: boolean; aristotle: boolean } {
  const { form, s, p } = read(spec.f, sw, w);
  const value = spec.given ?? true;
  const aristotle = spec.exist === true;
  const S: Term = { base: 0, neg: false };
  const P: Term = { base: 1, neg: false };
  const given: St = { form, s: S, p: P };
  const write = (f: Form) => fill(sw.forms[f], { s, p });
  const corners = FORMS.map((f): Corner => {
    if (f === form) return { form: f, value: value ? "true" : "false", text: write(f) };
    const v = valueOf(given, value, { form: f, s: S, p: P }, aristotle);
    const link = linkOf(form, f);
    const args = { f, x: form, s, v: w.values[v] };
    let why: string;
    if (link === "contradictories") why = fill(w.contra, args);
    else if (v === "open" && aristotle !== true && valueOf(given, value, { form: f, s: S, p: P }, true) !== "open") why = fill(w.modernLost, { ...args, link: w.links[link] });
    else if (link === "contraries") why = fill(v === "false" ? w.contraryFalse : w.contraryOpen, args);
    else if (link === "subcontraries") why = fill(v === "true" ? w.subcontraryTrue : w.subcontraryOpen, args);
    else if (UNIVERSAL(form)) why = fill(v === "true" ? w.downTrue : w.downOpen, args);
    else why = fill(v === "false" ? w.upFalse : w.upOpen, args);
    return { form: f, value: v, text: write(f), why };
  });
  return { corners, given: form, s, p, value, aristotle };
}

// ---------- immediate inferences ----------

export type Inference = { kind: "converse" | "obverse" | "contrapositive"; text: string; value: Value; limited?: string };

const OBVERT: Record<Form, Form> = { A: "E", E: "A", I: "O", O: "I" };
const SUBALTERN: Partial<Record<Form, Form>> = { A: "I", E: "O" };

export function inferencesOf(spec: LogicSpec, sw: SylWords, w: SquareWords): Inference[] {
  const { form, s, p } = read(spec.f, sw, w);
  const value = spec.given ?? true;
  const aristotle = spec.exist === true;
  const given: St = { form, s: { base: 0, neg: false }, p: { base: 1, neg: false } };
  const name = (t: Term) => {
    const base = t.base === 0 ? s : p;
    return t.neg ? fill(w.non, { t: base }) : base;
  };
  const write = (st: St) => fill(sw.forms[st.form], { s: name(st.s), p: name(st.p) });
  const flip = (t: Term): Term => ({ ...t, neg: !t.neg });
  const made: [Inference["kind"], St][] = [
    ["converse", { form, s: given.p, p: given.s }],
    ["obverse", { form: OBVERT[form], s: given.s, p: flip(given.p) }],
    ["contrapositive", { form, s: flip(given.p), p: flip(given.s) }],
  ];
  return made.map(([kind, st]) => {
    const v = valueOf(given, value, st, aristotle);
    const sub = SUBALTERN[st.form];
    // When the full statement is open, the weaker one under it may still follow.
    const weaker: St | undefined = sub ? { ...st, form: sub } : undefined;
    const limited = v === "open" && weaker && valueOf(given, value, weaker, aristotle) === "true" ? write(weaker) : undefined;
    return { kind, text: write(st), value: v, ...(limited ? { limited } : {}) };
  });
}

// ---------- drawing ----------

const FILL: Record<Value, [string, string]> = { true: ["#d3f9d8", C.green], false: ["#ffe3e3", C.red], open: ["#f1f3f5", "#868e96"] };

/** Wraps a statement into lines that fit a box. */
function lines(s: string, width: number, size: number): string[] {
  const out: string[] = [];
  for (const word of s.split(" ")) {
    const last = out[out.length - 1];
    if (last !== undefined && tw(`${last} ${word}`, size) <= width) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}

function drawSquare(sq: ReturnType<typeof squareOf>, w: SquareWords): { svg: string; h: number } {
  const BW = 230;
  const BH = 66;
  const [xl, xr] = [44, W - 44 - BW];
  // Room above and below for the contraries and subcontraries, whose names can be wider than the gap between boxes.
  const [yt, yb] = [22, 210];
  const at: Record<Form, [number, number]> = { A: [xl, yt], E: [xr, yt], I: [xl, yb], O: [xr, yb] };
  const parts: string[] = [];
  const faint = !sq.aristotle;
  const edge = (x1: number, y1: number, x2: number, y2: number, lost: boolean, color: string, arrow = false) =>
    `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${lost ? "#ced4da" : color}" stroke-width="${lost ? 1.4 : 2}"${lost ? ` stroke-dasharray="6 4"` : ""}${arrow && !lost ? ` marker-end="url(#sq-arrow)"` : ""}/>`;
  parts.push(`<defs><marker id="sq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.purple}"/></marker></defs>`);
  // Contraries along the top, subcontraries along the bottom, subalterns down the sides, contradictories across.
  parts.push(edge(xl + BW, yt + BH / 2, xr, yt + BH / 2, faint, C.orange));
  parts.push(edge(xl + BW, yb + BH / 2, xr, yb + BH / 2, faint, C.blue));
  parts.push(edge(xl + BW / 2, yt + BH, xl + BW / 2, yb - 2, faint, C.purple, true));
  parts.push(edge(xr + BW / 2, yt + BH, xr + BW / 2, yb - 2, faint, C.purple, true));
  parts.push(edge(xl + BW, yt + BH, xr, yb, false, C.red));
  parts.push(edge(xr, yt + BH, xl + BW, yb, false, C.red));
  const label = (x: number, y: number, s: string, color: string, lost: boolean) => txt(x, y, s, { size: 11.5, anchor: "middle", color: lost ? "#adb5bd" : color, bold: !lost });
  parts.push(label(W / 2, yt - 8, w.links.contraries, C.orange, faint));
  parts.push(label(W / 2, yb + BH + 16, w.links.subcontraries, C.blue, faint));
  // The diagonals cross under this label, so it gets a white ground.
  const cw = tw(w.links.contradictories, 11.5) + 10;
  parts.push(`<rect x="${r2(W / 2 - cw / 2)}" y="${r2((yt + BH + yb) / 2 - 10)}" width="${r2(cw)}" height="18" rx="4" fill="#fff"/>`);
  parts.push(label(W / 2, (yt + BH + yb) / 2 + 4, w.links.contradictories, C.red, false));
  parts.push(`<text transform="translate(${xl - 10} ${(yt + BH + yb) / 2}) rotate(-90)" text-anchor="middle" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif" font-size="11.5" fill="${faint ? "#adb5bd" : C.purple}"${faint ? "" : ` font-weight="700"`}>${w.links.subalterns}</text>`);
  parts.push(`<text transform="translate(${xr + BW + 14} ${(yt + BH + yb) / 2}) rotate(90)" text-anchor="middle" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif" font-size="11.5" fill="${faint ? "#adb5bd" : C.purple}"${faint ? "" : ` font-weight="700"`}>${w.links.subalterns}</text>`);
  for (const c of sq.corners) {
    const [x, y] = at[c.form];
    const [bg, fg] = FILL[c.value];
    const isGiven = c.form === sq.given;
    parts.push(`<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="8" fill="${bg}" stroke="${fg}" stroke-width="${isGiven ? 3 : 1.6}"/>`);
    const head = `${c.form} · ${w.values[c.value]}${isGiven ? ` (${w.given})` : ""}`;
    parts.push(txt(x + 10, y + 17, head, { size: 12, bold: true, color: fg }));
    lines(c.text, BW - 20, 13).slice(0, 3).forEach((l, i) => parts.push(txt(x + BW / 2, y + 36 + i * 15, l, { size: 13, anchor: "middle" })));
  }
  return { svg: parts.join(""), h: yb + BH + 30 };
}

/** The immediate inferences as a small table under the square, what follows by limitation on a line of its own. */
function drawInferences(inf: Inference[], w: SquareWords, top: number): { svg: string; h: number } {
  const labelW = Math.max(...inf.map((i) => tw(w[i.kind], 13))) + 20;
  const parts = [txt(44, top + 14, w.inferences, { size: 13, bold: true, color: "#495057" })];
  let y = top + 24;
  for (const i of inf) {
    const [bg, fg] = FILL[i.value];
    const verdict = w.values[i.value];
    const room = W - 88 - labelW - tw(verdict, 13) - 40;
    const rows = [
      ...lines(i.text, room, 12.5).map((l) => ({ l, color: C.ink })),
      ...(i.limited ? lines(fill(w.limitation, { s: i.limited }), room, 12.5).map((l) => ({ l, color: C.purple })) : []),
    ];
    const h = Math.max(34, 10 + rows.length * 15);
    parts.push(`<rect x="44" y="${y}" width="${W - 88}" height="${h}" rx="6" fill="${bg}"/>`);
    parts.push(txt(54, y + h / 2 + 4.5, w[i.kind], { size: 13, bold: true }));
    parts.push(txt(W - 54, y + h / 2 + 4.5, verdict, { size: 13, bold: true, anchor: "end", color: fg }));
    const y0 = y + h / 2 - ((rows.length - 1) * 15) / 2 + 4.5;
    rows.forEach((r, j) => parts.push(txt(44 + labelW, y0 + j * 15, r.l, { size: 12.5, color: r.color })));
    y += h + 6;
  }
  return { svg: parts.join(""), h: y - top };
}

export function renderSquare(spec: LogicSpec, sw: SylWords, w: SquareWords): RenderedSvg {
  const sq = squareOf(spec, sw, w);
  const inf = inferencesOf(spec, sw, w);
  const square = drawSquare(sq, w);
  const table = drawInferences(inf, w, square.h + 6);
  const caps: Caption[] = sq.corners.filter((c) => c.why).map((c) => ({ text: c.why!, color: FILL[c.value][1] }));
  caps.push({ text: sq.aristotle ? w.aristotle : fill(w.modern, { s: sq.s }), color: C.ink });
  return composeText(w.title, square.svg + table.svg, square.h + 6 + table.h, caps);
}

// ---------- examples ----------

const sqr = (f: string, given = true, aristotle = true): LogicSpec => ({ topic: "square", f, g: "", vals: "", tf: true, given, exist: aristotle });

export const SQUARE_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "A true", spec: sqr("All dogs are mammals") },
  { label: "A false", spec: sqr("All swans are white", false) },
  { label: "E true", spec: sqr("No fish are mammals") },
  { label: "I true", spec: sqr("Some students are athletes") },
  { label: "O false", spec: sqr("Some squares are not rectangles", false) },
  { label: "A true, modern", spec: sqr("All unicorns are horses", true, false) },
  { label: "Just the letters", spec: sqr("E") },
  { label: "Все кошки — млекопитающие", spec: sqr("Все кошки есть млекопитающие") },
  { label: "ყველა ძაღლი ძუძუმწოვარია", spec: sqr("ყველა ძაღლი არის ძუძუმწოვარი") },
];
