// Practice: Equal fractions.
import { fill, r2 } from "../chart";
import { eqQuestion, partsSvg } from "../equivMatch";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The one of four equal to a fraction (src/math/equivMatch.ts); the wrong ones are slips that get named.
  const t = eqQuestion(L, r.next);
  const best = t.options[t.right];
  const f = `\\frac{${t.n}}{${t.d}}`;
  const steps =
    L === 1 ? [`${t.n} + ${t.d - t.n} = ${t.d}, \\quad ${f}`]
    : L === 2 ? [`${f} = \\frac{${t.n} \\times ${t.k}}{${t.d} \\times ${t.k}} = ${best.tex}`]
    : [`${t.n} \\div ${t.d} = ${Number((t.n / t.d).toFixed(3))}`, `${Number((t.n / t.d).toFixed(3))} = ${Number(((t.n / t.d) * 100).toFixed(1))}\\%`];
  const pic = L === 1 ? partsSvg(t.n, t.d) : null;
  return {
    prompt: L === 1 ? w.prompts.equivShaded : fill(L === 2 ? w.prompts.equivFraction : w.prompts.equivDecimal, { f: `${t.n}/${t.d}` }),
    q: L === 1 ? "" : f,
    ...(pic ? { pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic}</g>`, h: 50, w: 240 } } : {}),
    answer: { k: "near", options: t.options, right: t.right, traps: t.traps.map((x) => ({ id: x.id, a: { k: "near", options: t.options, right: x.at }, vars: x.vars })) },
    show: L === 1 ? f : `${f} = ${best.tex}`,
    plain: best.plain,
    format: "near",
    steps,
  };
};

export default gen;
