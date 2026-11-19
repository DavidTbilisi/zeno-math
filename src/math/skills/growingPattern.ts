// Practice: Growing patterns.
import { fill, r2 } from "../chart";
import { countOf, figuresSvg, growAnswer, growQuestion, growSteps, scaledFigure } from "../growing";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Figures 1 to 3 of a pattern of squares, and figure k or which figure (src/math/growing.ts).
  const t = growQuestion(L, r.next);
  const v = growAnswer(t);
  const slip = scaledFigure(t);
  const traps: Trap[] = slip ? [{ id: "scaledFigure", a: num(slip.v), vars: { k: slip.k, f1: slip.f1, s: slip.s, k1: slip.k - 1, v } }] : [];
  const pic = figuresSvg(t.kind, false, 420);
  const steps = growSteps(t);
  return {
    prompt: t.ask.dir === "which" ? fill(w.prompts.growWhich, { n: t.ask.count }) : fill(w.prompts.growCount, { k: t.ask.dir === "count" ? t.ask.k : 4 }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
    answer: { ...num(v), traps },
    show: t.ask.dir === "which" ? `n = ${v}, \\quad ${countOf(t.kind, v)}` : steps[steps.length - 1],
    plain: String(v),
    format: "number",
    solution: { kind: "grow", spec: { task: t, steps } },
  };
};

export default gen;
