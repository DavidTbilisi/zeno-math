// Practice: Balance puzzles.
import { balanceSteps, balanceSvg, balanceTask, oneSideOnly } from "../balance";
import { r2 } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Scales that balance, and what one ■ weighs (src/math/balance.ts): one shape, the same shape on both pans, two
  // shapes on two scales.
  const t = balanceTask(L, r.next);
  const pic = balanceSvg(t);
  const slip = oneSideOnly(t);
  const traps: Trap[] = slip ? [{ id: "oneSideOnly", a: num(slip.v), vars: { c: slip.c, k: slip.a - slip.c, b: slip.b, d: slip.d } }] : [];
  const steps = balanceSteps(t);
  return {
    prompt: w.prompts.balance,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
    answer: { ...num(t.values[0]), traps },
    show: `\\blacksquare = ${t.values[0]}`,
    plain: String(t.values[0]),
    format: "number",
    solution: { kind: "balance", spec: { task: t, steps } },
  };
};

export default gen;
