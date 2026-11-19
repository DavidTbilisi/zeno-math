// Practice: Closer to?.
import { nearSteps, nearTask } from "../benchmark";
import { fill } from "../chart";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Which benchmark a number is nearest (src/math/benchmark.ts); the answer is the benchmark, typed or picked.
  const t = nearTask(L, r.next);
  const best = t.options[t.right];
  // Easy, between two tens: the lower ten when the next digit is 5 or more is a cut, not a rounding.
  const traps: Trap[] = L === 1 && t.options.length === 2 && t.right === 1 ? [{ id: "truncated", a: { k: "near", options: t.options, right: 0 } }] : [];
  return {
    prompt: fill(L === 3 ? w.prompts.closerToCalc : w.prompts.closerTo, { opts: t.options.map((o) => o.text).join(", ") }),
    q: t.tex,
    answer: { k: "near", options: t.options, right: t.right, traps },
    show: `${t.tex} \\approx ${best.tex}`,
    plain: best.plain,
    format: "near",
    steps: nearSteps(t),
  };
};

export default gen;
