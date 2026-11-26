// Practice: Picture, line and pie graphs. Since #735 half the medium and hard questions are new kinds. Medium: line
// plots of fractions (how many above a value, the longest less the shortest, all of one length together) and one to
// build from a list where 1/2 is also written 4/8. Hard: whether a variable is categorical or quantitative, discrete
// or continuous; a relative frequency from raw data; the height of a histogram's bar; the tallest stack of a dot plot.
// The value counted as more than itself, the longest for the difference, the count for the total, an equal fraction
// missed, a number code taken for a quantity, a count called continuous, a measure called discrete, the count for the
// share, a bar's right end counted in, and the stack's height for its value are the slips.
import { fill, r2 } from "../chart";
import { dataGridSvg, fracLabel, linePlotSvg } from "../displays";
import { pickPart } from "../tTails";
import { diagramPic, type DiagramSolution, hourText, lineQuestion, lineSteps, lineTraps, pictoQuestion, pictoSteps, pictoTraps, pieCount, pieQuestion, pieSteps, pieTraps, stemQuestion, stemSteps, stemTraps } from "../dataGraphs";
import type { MistakeId } from "../mistakes";
import { fracTex, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

const place = (p: { body: string; w: number; h: number }): Part["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });
const trap = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
/** A number answer with its slips; a slip equal to the answer, or to one before it, is dropped. */
const numWith = (v: number, traps: Trap[], frac?: [number, number]) => ({
  answer: { ...num(v), traps: traps.filter((t, i) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9 && traps.findIndex((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v) === i) },
  show: frac && frac[1] > 1 ? fracTex(frac[0], frac[1]) : String(v), plain: frac && frac[1] > 1 ? `${frac[0]}/${frac[1]}` : String(v), format: (frac && frac[1] > 1 ? "fraction" : "number") as Part["format"],
});
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** n/d in lowest terms. */
const low = (n: number, d: number): [number, number] => [n / (gcd(n, d) || 1), d / (gcd(n, d) || 1)];
/** n/d in lowest terms as TeX: a whole number, or a fraction. */
const texOf = (n: number, d: number) => (low(n, d)[1] === 1 ? String(low(n, d)[0]) : fracTex(...low(n, d)));

function more(r: Rng, L: 2 | 3, w: PracticeWords): Part {
  const W = w.dgK;
  if (L === 2) {
    const t = r.pick(["above", "diff", "total", "build"] as const);
    const d = t === "build" ? 8 : r.pick([2, 4, 8]);
    if (t === "build") {
      // A list of eighths where a half is sometimes written 1/2 and sometimes 4/8: both go above 4/8.
      const n = r.int(10, 14);
      const vs = Array.from({ length: n }, () => r.pick([1, 2, 3, 4, 4, 5, 6, 7]));
      const halves = vs.filter((v) => v === 4).length;
      if (halves < 3) return more(r, L, w);
      const written = vs.map((v, i) => (v === 4 && i % 2 === 0 ? "1/2" : `${v}/8`));
      const plain = written.filter((x) => x === "4/8").length;
      if (!plain || plain === halves) return more(r, L, w);
      return {
        prompt: W.buildQ, q: "", pic: place(dataGridSvg(written, 7)),
        ...numWith(halves, [trap("equivFractionMissed", plain, { p: plain, h: halves - plain, v: halves }), trap("equivFractionMissed", halves - plain, { p: halves - plain, h: plain, v: halves })]),
        steps: [`${plain} + ${halves - plain} = ${halves}`],
      };
    }
    const top = d === 2 ? 6 : d === 4 ? 8 : 10;
    const n = r.int(8, 13);
    const vs = Array.from({ length: n }, () => r.int(1, top));
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    if (hi - lo < 3) return more(r, L, w);
    const pic = place(linePlotSvg(vs, 0, top, d, W.water));
    const count = (k: number) => vs.filter((v) => v === k).length;
    if (t === "above") {
      const k = r.int(lo + 1, hi - 1);
      if (!count(k)) return more(r, L, w);
      const v = vs.filter((x) => x > k).length;
      const right = [...new Set(vs)].filter((x) => x > k).sort((x, y) => x - y).map(count);
      return { prompt: fill(W.aboveQ, { k: fracLabel(k, d) }), q: "", pic, ...numWith(v, [trap("dotIncludesEqual", v + count(k), { k: fracLabel(k, d), e: count(k) })]), steps: [right.length > 1 ? `${right.join(" + ")} = ${v}` : `${v}`] };
    }
    if (t === "diff") {
      return {
        prompt: W.diffQ, q: "", pic,
        ...numWith((hi - lo) / d, [trap("longestAsDifference", hi / d, { x: fracLabel(hi, d), m: fracLabel(lo, d), v: fracLabel(hi - lo, d) })], low(hi - lo, d)),
        steps: [`${texOf(hi, d)} - ${texOf(lo, d)} = ${texOf(hi - lo, d)}`],
      };
    }
    // All the plants given k litres together.
    const k = r.pick([...new Set(vs)].filter((x) => count(x) >= 2 && x % d !== 0));
    if (k === undefined) return more(r, L, w);
    const c = count(k);
    return {
      prompt: fill(W.totalQ, { k: fracLabel(k, d) }), q: "", pic,
      ...numWith((c * k) / d, [trap("countNotTimesValue", c, { c, k: fracLabel(k, d), v: fracLabel(c * k, d) })], low(c * k, d)),
      steps: [`${c} \\times ${fracTex(k, d)} = ${fracTex(c * k, d)}${low(c * k, d)[1] === d ? "" : ` = ${texOf(c * k, d)}`}`],
    };
  }
  const t = r.pick(["quant", "disc", "share", "hist", "dot"] as const);
  if (t === "quant" || t === "disc") {
    // A survey and four of its variables: [a category, a measure, a count, a number that only names].
    const sv = r.int(0, 2);
    const name = (k: number) => W[`v${sv}${k}` as "v00"];
    if (t === "quant") {
      const real = r.pick([1, 2]);
      return pickPart(r, [name(3), name(real), name(0)], 1, [{ id: "codeAsQuantitative", at: 0, vars: { x: name(3) } }, { id: "categoryAsQuantitative", at: 2, vars: { x: name(0) } }], fill(W.quantQ, { s: W[`s${sv}` as "s0"] }), [`\\text{${fill(W.quantWhy, { x: name(real) })}}`]);
    }
    const k = r.pick([1, 2]);
    return pickPart(r, [W.discrete, W.continuous], k === 2 ? 0 : 1, [k === 2 ? { id: "countAsContinuous", at: 1, vars: { x: name(k) } } : { id: "measureAsDiscrete", at: 0, vars: { x: name(k) } }], fill(W.discQ, { x: name(k), s: W[`s${sv}` as "s0"] }), [`\\text{${W[k === 2 ? "discWhy" : "contWhy"]}}`]);
  }
  if (t === "share") {
    // Twenty favourite colours: each is 5 % of the class.
    const cols = [W.red, W.blue, W.green, W.yellow];
    const ns = [0, 0, 0, 0];
    const items = Array.from({ length: 20 }, () => {
      const k = r.int(0, 3);
      ns[k]++;
      return cols[k];
    });
    const k = r.int(0, 3);
    if (!ns[k]) return more(r, L, w);
    return {
      prompt: fill(W.shareQ, { c: cols[k] }), q: "", pic: place(dataGridSvg(items, 5)),
      ...numWith(ns[k] * 5, [trap("countForShare", ns[k], { c: ns[k], n: 20, v: ns[k] * 5 })]),
      steps: [`${ns[k]} \\div 20 = ${ns[k] / 20} = ${ns[k] * 5}\\%`],
    };
  }
  if (t === "hist") {
    // Ages in bars of ten that take in their left end, not their right; one age sits on the asked bar's right end.
    const a = r.pick([20, 30, 40]);
    const vs = Array.from({ length: 12 }, () => r.int(a - 10, a + 19));
    vs[r.int(0, 11)] = a + 10;
    const v = vs.filter((x) => x >= a && x < a + 10).length;
    const edge = vs.filter((x) => x === a + 10).length;
    if (!v) return more(r, L, w);
    return {
      prompt: fill(W.histQ, { l: a - 10, a, b: a + 10, h: a + 20 }), q: "", pic: place(dataGridSvg(vs.map(String), 6)),
      ...numWith(v, [trap("binEdgeBoth", v + edge, { b: a + 10, e: edge, v })]),
      steps: [`\\text{${vs.filter((x) => x >= a && x < a + 10).sort((x, y) => x - y).join(", ")}}: ${v}`],
    };
  }
  // A dot plot to build: its tallest stack stands at the most common number, not at the stack's height.
  const vs = Array.from({ length: 12 }, () => r.int(1, 6));
  const counts = [1, 2, 3, 4, 5, 6].map((k) => vs.filter((x) => x === k).length);
  const tall = Math.max(...counts);
  const m = counts.indexOf(tall) + 1;
  if (counts.filter((c) => c === tall).length > 1 || m === tall) return more(r, L, w);
  return {
    prompt: W.dotQ, q: "", pic: place(dataGridSvg(vs.map(String), 6)),
    ...numWith(m, [trap("modeAsCount", tall, { c: tall, m })]),
    steps: [`\\text{${fill(W.dotWhy, { m, c: tall })}}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 5) return more(r, L as 2 | 3, w);
  // The other data diagrams (src/math/dataGraphs.ts): a picture graph (P2), a line graph of the temperature (P4), a
  // pie chart or a stem-and-leaf plot (P6). The answer is a number; the worked solution marks what was read.
  const ask = (prompt: string, spec: DiagramSolution, v: number, traps: { id: MistakeId; v: number; vars: Record<string, string | number> }[], steps: string[], units?: readonly string[]): ReturnType<Gen> => {
    const pic = diagramPic(spec);
    return {
      prompt,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "num", v, tol: 1e-9, units, traps: traps.map((t) => ({ id: t.id, a: num(t.v), vars: t.vars })) },
      show: String(v),
      plain: String(v),
      format: "number",
      solution: { kind: "diagram", spec: { ...spec, steps } },
    };
  };
  if (L === 1) {
    const q = pictoQuestion(r.next);
    const [a, b] = q.at.map((k) => q.task.rows[k].icon);
    return ask(fill(q.ask === "one" ? w.prompts.chartOne : w.prompts.chartMore, { a, b }), { kind: "picto", q }, q.v, pictoTraps(q), pictoSteps(q));
  }
  if (L === 2) {
    const q = lineQuestion(r.next);
    const t = hourText(q.task.from + q.at, q.ask === "half");
    const prompt = q.ask === "read" ? w.prompts.lineRead : q.ask === "half" ? w.prompts.lineHalf : w.prompts.lineRise;
    return ask(fill(prompt, { t }), { kind: "line", q }, q.v, lineTraps(q), lineSteps(q), ["°C", "°"]);
  }
  if (r.next() < 0.5) {
    const q = pieQuestion(r.next);
    const a = q.task.slices[q.at].icon;
    const prompt = q.ask === "count" ? w.prompts.pieCount : w.prompts.pieAngle;
    return ask(fill(prompt, { n: q.task.n, a, k: pieCount(q) }), { kind: "pie", q }, q.v, pieTraps(q), pieSteps(q), q.ask === "angle" ? ["°"] : undefined);
  }
  const q = stemQuestion(r.next);
  const prompt = q.ask === "median" ? w.prompts.stemMedian : w.prompts.stemRange;
  return ask(fill(prompt, { n: q.task.marks.length }), { kind: "stem", q, words: w.stemLeaf }, q.v, stemTraps(q), stemSteps(q));
};

export default gen;
