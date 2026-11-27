// Practice: Algebraic fractions. Since #731, four medium and hard questions in ten are new kinds: medium, someone's
// working checked, terms cancelled in (x + a)/(x + b) or a division not turned over; hard, in new settings, two pipes
// filling a tank, in hours and as one fraction in x, and two juices mixed. Terms cancelled, the division not turned
// over, the times added or averaged and the juices mixed half and half are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import { fractionQuestion } from "../formulae";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 6) return more(r, L, w);
  // Simplify by factorising (easy); add, subtract, multiply and divide over linear bottoms (medium) and over
  // quadratic ones that are factorised first (hard), as one fraction cut down (src/math/formulae.ts).
  const q = fractionQuestion(r.next, L);
  const simplify = ["monomial", "termsCancel", "bracket", "diffSquares", "quadQuad"].includes(q.kind);
  return {
    prompt: simplify ? w.formulae.simplify : w.formulae.single,
    q: q.q,
    answer: { k: "expr", e: parseE(q.ans), mode: "fraction", traps: q.traps.map((t) => ({ id: t.id, a: { k: "expr", e: parseE(t.e) }, vars: t.vars })) },
    show: q.show,
    plain: q.ans,
    format: "algFraction",
    steps: q.steps,
  };
};

function numPart(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  const kept = traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v));
  return { prompt, q: "", answer: { ...num(v), traps: kept }, show: String(v), plain: String(v), format: "number", steps };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.afrM;
  if (L === 2) {
    if (r.next() < 0.5) {
      // (x + a)/(x + b) "cut down" to a/b: x is a term, not a factor.
      const a = r.int(2, 9);
      let b = r.int(2, 9);
      while (b === a || b % a === 0 || a % b === 0) b = r.int(2, 9);
      const e = `(x + ${a})/(x + ${b})`;
      const opts = [W.yes, W.noTerms, fill(W.noIs, { v: `1 + ${a}/${b}` })];
      return pickPart(r, opts, 1, [{ id: "cancelTerms", at: 0, vars: { x: `${e} = ${a}/${b}`, f: e, v: e } }],
        fill(W.checkQ, { e, s: `${a}/${b}` }), [`\\frac{x + ${a}}{x + ${b}}: \\text{${W.noFactor}}`]);
    }
    // (x/a) ÷ (x/b) worked as a product.
    const [a, b] = r.pick([[3, 6], [2, 8], [4, 12], [5, 10], [2, 6], [3, 12]] as const);
    const v = b / a;
    const opts = [W.yes, fill(W.noIs, { v }), fill(W.noIs, { v: `x/${a * b}` })];
    return pickPart(r, opts, 1, [{ id: "divisionNotFlipped", at: 0, vars: { b, a, v } }],
      fill(W.checkQ, { e: `(x/${a}) ÷ (x/${b})`, s: `x²/${a * b}` }), [`\\frac{x}{${a}} \\times \\frac{${b}}{x} = ${b / a}`]);
  }
  const t = r.pick(["hours", "hours", "fraction", "mix"] as const);
  if (t === "hours") {
    const [a, b] = r.pick([[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [6, 3], [20, 30]] as const);
    const v = (a * b) / (a + b);
    return numPart(fill(W.pipesQ, { a, b }), v, [
      { id: "workTimesAdded", a: num(a + b), vars: { a, b, v } },
      { id: "workTimesAveraged", a: num((a + b) / 2), vars: { a, b, v } },
    ], [`\\frac{1}{${a}} + \\frac{1}{${b}} = \\frac{${a + b}}{${a * b}}`, `\\frac{${a * b}}{${a + b}} = ${v}`]);
  }
  if (t === "fraction") {
    // Pipes of x and x + k hours: 1/x + 1/(x + k) as one fraction.
    const k = r.int(1, 6);
    const right = `(2x + ${k})/(x(x + ${k}))`;
    const e = (s: string) => parseE(s.replace(/(\d)x/g, "$1*x").replace(/x\(/g, "x*("));
    return {
      prompt: fill(W.pipesXQ, { k }), q: "", show: tex(e(right)), plain: right, format: "algFraction",
      answer: { k: "expr", e: e(right), mode: "fraction", traps: [{ id: "workTimesAdded", a: { k: "expr", e: e(`1/(2x + ${k})`) }, vars: { a: "x", b: `(x + ${k})`, v: right } }] },
      steps: [`\\frac{1}{x} + \\frac{1}{x + ${k}} = \\frac{x + ${k} + x}{x(x + ${k})} = \\frac{2x + ${k}}{x(x + ${k})}`],
    };
  }
  // V litres of a q % juice and how much of a p % one makes an m % mix.
  for (;;) {
    const [q, p, V] = [r.pick([10, 20]), r.pick([50, 60, 80]), r.pick([6, 10, 12, 20])];
    const m = r.pick([25, 30, 40]);
    const v = (V * (m - q)) / (p - m);
    if (!Number.isInteger(v) || 2 * m === p + q || v === V) continue;
    return numPart(fill(W.mixQ, { p, V, q, m }), v, [{ id: "mixtureEqualParts", a: num(V), vars: { V, m, v } }],
      [`${q}\\% \\times ${V} + ${p}\\% \\times y = ${m}\\% \\times (${V} + y)`, `y = \\frac{${V}(${m} - ${q})}{${p} - ${m}} = ${v}`]);
  }
}

export default gen;
