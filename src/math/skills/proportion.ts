// Practice: Direct and inverse proportion.
import { fill, r2 } from "../chart";
import { algebraQuestion, graphSvg, isWordKind, powerQuestion, wordQuestion, wordSentences, type ProportionQuestion, type WordKind } from "../proportion";
import { textOf } from "../wordMarks";
import { fracTex, num, withIdeas } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { lineGraph } from "../propPics";
import { opt, pickOf, word } from "../signedKit";

const t2 = (v: number) => String(Number(v.toFixed(2)));
/** A table of x and y in TeX. */
const table = (xs: number[], ys: (number | string)[], x = "x", y = "y") =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} ${x} & ${xs.join(" & ")} \\\\ \\hline ${y} & ${ys.join(" & ")} \\end{array}`;
const wrap = (p: { body: string; w: number; h: number }) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });

/**
 * The kinds #708 added. Easy: is y proportional to x in a table (each y the same amount more than x is the slip), and
 * which proportion gives a cost (the second ratio upside down is the slip). Medium: is a graph proportional (a straight
 * line that misses (0, 0) is the slip), k from an equation such as 3y = 12x (the number with x is the slip), k from a
 * table (x ÷ y is the slip), what a point on a cost graph means, and which point is on y = kx (the point read
 * backwards is the slip). Hard, the new setting: two phone plans compared by their k (minutes per lari is the slip),
 * and what k means in a cost equation.
 */
function propMore(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.prop;
  const yes = word(W.yes);
  const no = word(W.no);
  if (L === 1 && kind === 1) {
    const xs = r.pick([[1, 2, 4, 5], [2, 4, 5, 10], [1, 4, 5, 10]]);
    if (r.next() < 0.5) {
      const k = r.int(2, 9);
      return withIdeas(["directProp"], pickOf(r, W.isTable, yes, [], [no], { q: table(xs, xs.map((x) => k * x)), steps: xs.map((x) => `\\frac{${k * x}}{${x}} = ${k}`) }));
    }
    const c = r.int(1, 6);
    const [x1, x2] = xs;
    const vars = { c, y1: x1 + c, x1, r1: t2((x1 + c) / x1), y2: x2 + c, x2, r2: t2((x2 + c) / x2) };
    return withIdeas(["directProp"], pickOf(r, W.isTable, no, [{ o: yes, id: "constantDifference", vars }], [], { q: table(xs, xs.map((x) => x + c)), steps: [`\\frac{${x1 + c}}{${x1}} = ${vars.r1} \\ne \\frac{${x2 + c}}{${x2}} = ${vars.r2}`] }));
  }
  if (L === 1) {
    // a notebooks cost b; c notebooks cost x: notebooks over cost on both sides.
    const a = r.int(2, 6);
    const b = a * r.int(2, 5);
    let c: number;
    do c = r.int(3, 12);
    while (c === a);
    const right = opt(`\\frac{${a}}{${b}} = \\frac{${c}}{x}`);
    const flipped = opt(`\\frac{${a}}{${b}} = \\frac{x}{${c}}`);
    return withIdeas(["propEquation"], pickOf(r, fill(W.writeProp, { a, b, c }), right, [{ o: flipped, id: "proportionFlipped", vars: { right: right.text } }], [opt(`\\frac{${a}}{x} = \\frac{${c}}{${b}}`)], { steps: [`x = \\frac{${b} \\times ${c}}{${a}} = ${t2((b * c) / a)}`] }));
  }
  if (L === 2 && kind === 1) {
    const k = r.pick([1, 2, 3, 0.5]);
    const ys = Math.max(1, Math.ceil((k * 6) / 8));
    if (r.next() < 0.5) return withIdeas(["directProp"], pickOf(r, W.isGraph, yes, [], [no], { pic: lineGraph(k, 0, 6, ys), steps: [`y = ${k === 1 ? "" : k}x`] }));
    const c = ys * r.int(1, 2);
    return withIdeas(["directProp"], pickOf(r, W.isGraph, no, [{ o: yes, id: "lineNotThroughOrigin", vars: { c } }], [], { pic: lineGraph(k, c, 6, ys), steps: [`x = 0: \\; y = ${c} \\ne 0`] }));
  }
  if (L === 2 && kind === 2) {
    const a = r.int(2, 6);
    const k = r.int(2, 9);
    const traps: Trap[] = [{ id: "kCoefficientOnly", a: num(k * a), vars: { x: k * a, a, k } }];
    return withIdeas(["constantK"], { prompt: W.kEquation, q: `${a}y = ${k * a}x`, answer: { ...num(k), traps }, show: String(k), plain: String(k), format: "number", steps: [`y = \\frac{${k * a}}{${a}}x = ${k}x`] });
  }
  if (L === 2 && kind === 3) {
    const k = r.pick([0.5, 1.5, 2.5, 3, 4, 1.25, 0.75]);
    const xs = [4, 8, 12, 20];
    const traps: Trap[] = [{ id: "kInverted", a: num(Number((1 / k).toFixed(2)), 0.0051), vars: { x: t2(1 / k), yv: 4 * k, xv: 4, k } }];
    return withIdeas(["constantK"], { prompt: W.kTable, q: table(xs, xs.map((x) => k * x)), answer: { ...num(k), traps }, show: String(k), plain: String(k), format: "number", steps: [`k = \\frac{y}{x} = \\frac{${4 * k}}{4} = ${k}`, `y = ${k}x`] });
  }
  if (L === 2 && kind === 4) {
    // A point on a cost graph: x kilograms cost y lari; at x = 1, y is k.
    const k = r.int(2, 8);
    const p = r.pick([1, 2, 3, 4, 5]);
    const qq = k * p;
    const cost = (x: number, y: number) => word(fill(W.kgCost, { p: x, q: y }));
    const right = p === 1 ? word(fill(W.oneKgCost, { q: qq })) : cost(p, qq);
    const back = cost(qq, p);
    const other = p === 1 ? cost(2, qq) : word(fill(W.oneKgCost, { q: qq }));
    return withIdeas(["constantK"], pickOf(r, fill(W.pointMeaning, { p, q: qq }), right, [{ o: back, id: "pointReadBackwards", vars: { right: right.text } }], [other], { pic: wrap(graphSvg({ inverse: false, b: p, a: qq })), steps: [`(x, y) = (${p}, ${qq})`] }));
  }
  if (L === 2) {
    const k = r.pick([2, 3, 4, 5, 1.5, 2.5]);
    const b = r.pick([2, 4, 6]);
    const pt = (x: number, y: number) => opt(`(${x}, ${y})`);
    const right = pt(b, k * b);
    const back = pt(k * b, b);
    const others = [pt(b, k + b), pt(b + 1, k * b)].filter((o) => o.text !== right.text && o.text !== back.text);
    return withIdeas(["constantK"], pickOf(r, fill(W.graphPoint, { k }), right, [{ o: back, id: "pointReadBackwards", vars: { right: right.text } }], others, { steps: [`x = ${b}: \\; y = ${k} \\times ${b} = ${k * b}`] }));
  }
  if (kind === 1) {
    // Two phone plans: A's k in its equation, B's from its table.
    const ks = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4];
    const kA = r.pick(ks);
    const kB = r.next() < 0.2 ? kA : r.pick(ks.filter((k) => k !== kA));
    const ms = [10, 20, 40];
    const A = word(W.planA);
    const B = word(W.planB);
    const same = word(W.same);
    const steps = [`\\text{A}: k = ${kA}`, `\\text{B}: k = \\frac{${t2(kB * 10)}}{10} = ${kB}`];
    const q = table(ms, ms.map((m) => t2(kB * m)), "m", "y");
    const prompt = fill(W.compare, { e: `${kA}m` });
    if (kA === kB) return withIdeas(["constantK"], pickOf(r, prompt, same, [], [A, B], { q, steps }));
    const [right, wrong] = kA > kB ? [A, B] : [B, A];
    return withIdeas(["constantK"], pickOf(r, prompt, right, [{ o: wrong, id: "kInverted", vars: { x: `10 ÷ ${t2(kB * 10)} = ${t2(10 / (kB * 10))}`, yv: t2(kB * 10), xv: 10, k: kB } }], [same], { q, steps }));
  }
  const k = r.pick([2.5, 3, 3.5, 4, 4.5, 5]);
  return withIdeas(["constantK"], pickOf(r, fill(W.kMeaning, { k }), word(W.kOne), [{ o: word(W.kBack), id: "kInverted", vars: { x: W.kBack, yv: 2 * k, xv: 2, k } }], [word(W.kAll)], { steps: [`x = 1: \\; y = ${k} \\times 1 = ${k}`] }));
}

/**
 * The ideas a question of src/math/proportion.ts needs, by its kind (#755): a direct case k and y = kx, an inverse one x
 * × y the same, a power of x its own. A table or a graph may be either: its last line says which (y = k/x).
 */
function ideasOf(q: ProportionQuestion): string[] {
  const inverse = q.steps[q.steps.length - 1].startsWith("y = \\frac{k}{x}");
  switch (q.kind) {
    case "books": case "dumplings": case "fuel": return ["directProp"];
    case "workers": case "pipes": case "speed": case "kInverse": case "inverse": return ["inverseProp"];
    case "kDirect": case "direct": return ["directProp", "constantK"];
    case "table": case "graph": return inverse ? ["inverseProp"] : ["directProp", "constantK"];
    case "inversePower": case "scaleInverse": return ["powerProp", "inverseProp"];
    default: return ["powerProp"];
  }
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, L === 2 ? 5 : 2);
  if (extra > 0) return propMore(r, L, extra, w);
  // Direct and inverse proportion (src/math/proportion.ts): word problems through the amount for one or the product
  // that stays the same (easy); y = kx and y = k/x from a pair, a table or a graph (medium); y in proportion to a
  // power of x, x back from y, and y's factor when x is scaled (hard). The worked solution is the working.
  const q = L === 1 ? wordQuestion(r.next) : L === 2 ? algebraQuestion(r.next) : powerQuestion(r.next);
  const pic = q.graph ? graphSvg(q.graph) : null;
  // A word problem in its sentences, each with its mark (marked first in practice, issue #582).
  const marked = isWordKind(q.kind) ? wordSentences(q, w.proportion, (s) => fill(s, q.vars)) : undefined;
  const [shown, plain] = q.frac ? [fracTex(q.frac[0], q.frac[1]), `${q.frac[0]}/${q.frac[1]}`] : [String(q.v), String(q.v)];
  return withIdeas(ideasOf(q), {
    prompt: marked ? textOf(marked) : fill(w.proportion[q.kind as Exclude<typeof q.kind, WordKind>], q.vars),
    ...(marked ? { marked } : {}),
    q: q.q,
    pic: pic ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w } : undefined,
    answer: { ...num(q.v, 1e-9, q.frac ? { lowest: true } : {}), traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, 0.0051), vars: t.vars })) },
    show: shown,
    plain,
    format: q.frac ? "fraction" : "number",
    steps: q.steps,
  });
};

export default gen;
