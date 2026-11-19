// Practice: Conditional probability.
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    // Counts by A and B; the condition picks the row or column, the event the cell in it.
    const [a, b, c, d] = [r.int(3, 30), r.int(3, 30), r.int(3, 30), r.int(3, 30)];
    const [ask, top, bottom] = r.pick([
      ["P(A \\mid B)", a, a + c],
      ["P(B \\mid A)", a, a + b],
      ["P(A \\mid B')", b, b + d],
      ["P(B' \\mid A')", d, c + d],
      ["P(A' \\mid B)", c, a + c],
    ] as const);
    const v = fr(top, bottom);
    return {
      prompt: fill(w.prompts.condTable, { e: ask.replace(/\\mid/g, "|").replace(/'/g, "′") }),
      q: `\\begin{array}{c|cc} & B & B' \\\\ \\hline A & ${a} & ${b} \\\\ A' & ${c} & ${d} \\end{array}`,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      steps: [`${ask} = \\frac{${top}}{${bottom}} = ${v.tex()}`],
    };
  }
  // A condition D and a test: P(D), P(+ | D), P(+ | D′) in hundredths, so every answer is exact.
  const pD = fr(r.int(1, 5), 10);
  const pPos = fr(r.pick([70, 75, 80, 85, 90, 95] as const), 100);
  const pFalse = fr(r.pick([5, 10, 15, 20] as const), 100);
  const both = pD.mul(pPos);
  const plus = both.add(fr(1).sub(pD).mul(pFalse));
  const dec = (f: Frac) => String(Math.round(f.toNumber() * 1e6) / 1e6);
  const q = `P(D) = ${dec(pD)}, \\quad P(+ \\mid D) = ${dec(pPos)}, \\quad P(+ \\mid D') = ${dec(pFalse)}`;
  const solution = { kind: "statistics" as const, spec: { topic: "tree", pA: dec(pD), pBA: dec(pPos), pBnotA: dec(pFalse), nameA: "D", nameB: "+" } };
  const total = `P(+) = ${dec(pD)} \\cdot ${dec(pPos)} + ${dec(fr(1).sub(pD))} \\cdot ${dec(pFalse)} = ${dec(plus)}`;
  if (L === 2) return { prompt: w.prompts.condTotal, q, answer: num(plus.toNumber()), show: dec(plus), plain: dec(plus), format: "number", steps: [total], solution };
  const v = both.div(plus);
  return {
    prompt: w.prompts.condBayes,
    q,
    answer: num(v.toNumber(), 0.00051),
    show: `${v.tex()} \\approx ${dp(v.toNumber(), 3)}`,
    plain: dp(v.toNumber(), 3),
    format: "dp3",
    steps: [total, `P(D \\mid +) = \\frac{P(D)\\,P(+ \\mid D)}{P(+)} = \\frac{${dec(both)}}{${dec(plus)}} = ${v.tex()} \\approx ${dp(v.toNumber(), 3)}`],
    solution,
  };
};

export default gen;
