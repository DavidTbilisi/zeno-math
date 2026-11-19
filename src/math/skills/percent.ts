// Practice: Percentages.
import { fill } from "../chart";
import { type PercentSolution, percentSteps } from "../percentPics";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The picture: bars cut into chunks of 10 % (or 5 %, 20 %, 25 %) with each chunk's amount in it, and the working through one chunk.
  const P = (spec: PercentSolution) => ({ kind: "percent" as const, spec: { ...spec, steps: percentSteps(spec) } });
  if (L === 1) {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]);
    const a = 20 * r.int(2, 30);
    const v = (p * a) / 100;
    return { prompt: fill(w.prompts.percentOf, { p, a }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: P({ pic: "of", p, a }) };
  }
  const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
  const a = 20 * r.int(2, 30);
  if (L === 2) {
    const up = r.next() < 0.5;
    const b = (a * (100 + (up ? p : -p))) / 100;
    const v = up ? p : -p;
    return { prompt: fill(w.prompts.percentChange, { a, b }), q: "", answer: num(v), show: `${v}\\%`, plain: `${v}%`, format: "number", solution: P({ pic: "change", a, b }) };
  }
  const now = (a * (100 + p)) / 100;
  return { prompt: fill(w.prompts.percentReverse, { p, a: now }), q: "", answer: num(a), show: String(a), plain: String(a), format: "number", solution: P({ pic: "reverse", p, now, up: true }) };
};

export default gen;
